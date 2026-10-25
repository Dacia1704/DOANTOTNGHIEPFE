import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '@model/api-response';
import { LoginResponse } from '@model/auth/response/login-response';
import { RegisterResponse } from '@model/auth/response/register-response';
import { LoginRequest } from '@model/auth/request/login-request';
import { RegisterRequest } from '@model/auth/request/register-request';
import { RefreshTokenResponse } from '@model/auth/response/refresh-token-response';
import { AuthMapper } from '@model/auth/auth.mapper';
import { AuthSession, RoleCode } from '@model/auth/auth.model';
import { EmailOtpRequest, VerifyEmailRequest, ResetPasswordRequest } from '@model/auth/request/otp-request';

const KEY = 'trotot_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = `${environment.apiUrl}/auth`;

  /**
   * Session hiện tại ở dạng signal — component nào cũng có thể đọc reactive.
   * Khi login/register thành công hoặc logout sẽ cập nhật signal → header đổi ngay.
   */
  private readonly _session = signal<AuthSession | null>(this.restoreFromStorage());

  /** Readonly signal để template binding. */
  readonly session = this._session.asReadonly();

  /** Cho interceptor truy cập nhanh token hiện tại (không reactive). */
  get accessToken(): string | null {
    return this._session()?.accessToken ?? null;
  }

  get refreshToken(): string | null {
    return this._session()?.refreshToken ?? null;
  }

  /** Computed signal — topbar có thể dùng thay cho `user`. */
  readonly isLoggedIn = computed(() => this._session() !== null);

  hasPermission(code: string): boolean {
    return !!this._session()?.authorities?.includes(code);
  }

  /**
   * Vai trò nghiệp vụ chính (TENANT / LANDLORD / ADMIN).
   * Nếu user có nhiều role, ưu tiên ADMIN > LANDLORD > TENANT.
   */
  primaryRole(): RoleCode | null {
    const roles = this._session()?.roles ?? [];
    if (roles.includes(RoleCode.ADMIN)) return RoleCode.ADMIN;
    if (roles.includes(RoleCode.LANDLORD)) return RoleCode.LANDLORD;
    if (roles.includes(RoleCode.TENANT)) return RoleCode.TENANT;
    return null;
  }

  hasAnyRole(roles: RoleCode[]): boolean {
    const r = this.primaryRole();
    return !!r && roles.includes(r);
  }

  /** Trả về URL landing tương ứng với vai trò sau đăng nhập. */
  homeUrl(): string {
    const r = this.primaryRole();
    switch (r) {
      case RoleCode.ADMIN: return '/admin';
      case RoleCode.LANDLORD: return '/phong-cua-toi';
      case RoleCode.TENANT: return '/';
      default: return '/';
    }
  }

  /** API: đăng nhập → trả AuthSession (Model) cho component. */
  login(request: LoginRequest): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.api}/login`, request)
      .pipe(
        map(res => AuthMapper.fromLoginResponse(res.data)),
        tap(session => this.persistSession(session)),
      );
  }

  /** API: đăng ký tài khoản mới (TENANT hoặc LANDLORD). */
  register(request: RegisterRequest): Observable<AuthSession> {
    return this.http
      .post<ApiResponse<RegisterResponse>>(`${this.api}/register`, request)
      .pipe(
        map(res => AuthMapper.fromRegisterResponse(res.data)),
        tap(session => this.persistSession(session)),
      );
  }

  /** Refresh access token dùng trong interceptor. */
  refresh(): Observable<void> {
    const refreshToken = this.refreshToken;
    return this.http
      .post<ApiResponse<RefreshTokenResponse>>(`${this.api}/refresh`, { refreshToken })
      .pipe(
        map(res => res.data),
        tap(data => {
          const current = this._session();
          if (!current) return;
          const next: AuthSession = {
            ...current,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
          this.persistSession(next);
        }),
        map(() => void 0),
      );
  }

  logout(): void {
    const refreshToken = this.refreshToken;
    this.http
      .post(`${this.api}/logout`, { refreshToken })
      .subscribe({
        complete: () => this.clearSession(),
        error: () => this.clearSession(),
      });
  }

  forgotPassword(request: EmailOtpRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.api}/forgot-password`, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.api}/reset-password`, request);
  }

  sendVerifyEmail(request: EmailOtpRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.api}/send-verify-email`, request);
  }

  verifyEmail(request: VerifyEmailRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.api}/verify-email`, request);
  }

  clearSession(redirect = true): void {
    const returnUrl = this.router.url;
    this._session.set(null);
    localStorage.removeItem(KEY);
    if (redirect) this.router.navigate(['/login'], { queryParams: { redirect: returnUrl } });
  }

  /** Đồng bộ hồ sơ, giữ nguyên token và quyền của phiên hiện tại. */
  updateProfile(profile: Pick<AuthSession, 'id' | 'email' | 'phone' | 'fullName' | 'avatarUrl' | 'status' | 'roles'>): void {
    const current = this._session();
    if (current && current.id === profile.id) {
      this.persistSession({ ...current, ...profile });
    }
  }

  // ===== private helpers =====

  private persistSession(session: AuthSession): void {
    this._session.set(session);
    try {
      localStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      // localStorage không khả dụng (SSR / quota) — bỏ qua.
    }
  }

  private restoreFromStorage(): AuthSession | null {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  }
}
