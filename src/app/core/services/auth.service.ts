import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { map, Observable, tap, switchMap } from "rxjs";
import { environment } from "@environments/environment";
import { ApiResponse } from "@model/api-response";
import { LoginResponse } from "@model/auth/response/login-response";
import { LoginRequest } from "@model/auth/request/login-request";
import { RefreshTokenResponse } from "@model/auth/response/refresh-token-response";

const KEY = 'library_auth'

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = `${environment.apiUrl}/auth`;

  private get session(): LoginResponse | null {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  }
  get accessToken() { return this.session?.accessToken ?? null; }
  get refreshToken() { return this.session?.refreshToken ?? null; }
  get user() { return this.session; }

  isLoggedIn() { return !!this.accessToken; }
  hasPermission(code: string) { return !!this.session?.authorities?.includes(code); }

  /** ADMIN | LIBRARIAN | MEMBER ... (bỏ tiền tố ROLE_) */
  role(): string | null {
    const authorities = this.session?.authorities ?? [];
    const r = authorities.find((a: string) => a.startsWith('ROLE_'));
    return r ? r.replace('ROLE_', '') : null;
  }
  hasAnyRole(roles: string[]) { const r = this.role(); return !!r && roles.includes(r); }

  homeUrl(): string {
    switch (this.role()) {
      case 'ADMIN': console.log('/admin'); return '/admin';
      case 'TENANT': console.log('/tenant'); return '/tenant';
      case 'LANDLORD': console.log('/landlord'); return '/landlord';
      default: console.log('guest'); return '/home';
    }
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.api}/login`, request).pipe(
      map(res => res.data),
      tap(data => {
        localStorage.setItem(KEY, JSON.stringify(data));
      }),
    )
  }

  refresh(): Observable<void> {
    return this.http.post<ApiResponse<RefreshTokenResponse>>(
      `${this.api}/refresh`, { refreshToken: this.refreshToken }
    ).pipe(
      tap(res => localStorage.setItem(KEY, JSON.stringify({ ...this.session, ...res.data }))),
      map(() => void 0)
    );
  }
 
  logout() {
    const refreshToken = this.refreshToken;
    this.http.post(`${this.api}/logout`, { refreshToken }).subscribe({ complete: () => this.clearSession(), error: () => this.clearSession() });
  }
 
  clearSession() {
    localStorage.removeItem(KEY);
    this.router.navigateByUrl('/login');
  }
  

}