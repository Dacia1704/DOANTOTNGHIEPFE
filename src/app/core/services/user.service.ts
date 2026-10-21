import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { UserResponse } from '@model/user/response/user-response';
import { UpdateProfileRequest } from '@model/user/request/update-profile-request';
import { ChangePasswordRequest } from '@model/user/request/change-password-request';
import { UserList, UserProfile } from '@model/user/user.model';
import { UserStatus } from '@model/auth/auth.model';
import { UserMapper } from '@model/user/user.mapper';
import { UpdateUserRequest } from '@model/user/request/update-user-request';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.apiUrl}/users/me`;

  updateUser(id: string, request: UpdateUserRequest): Observable<UserProfile> {
    return this.profile(this.http.patch<ApiResponse<UserResponse>>(`${environment.apiUrl}/users/${encodeURIComponent(id)}`, request));
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${environment.apiUrl}/users/${encodeURIComponent(id)}`).pipe(map(() => void 0));
  }

  list(q: string, status: UserStatus | '', page = 0): Observable<UserList> {
    const params: Record<string, string | number> = { page, size: 20 };
    if (q.trim()) params['q'] = q.trim();
    if (status) params['status'] = status;
    return this.http.get<ApiResponse<PageResponse<UserResponse>>>(`${environment.apiUrl}/users`, { params }).pipe(
      map(response => ({
        items: response.data.data.map(user => UserMapper.fromResponse(user)),
        page: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.totalElements,
      })),
    );
  }

  getMe(): Observable<UserProfile> {
    return this.profile(this.http.get<ApiResponse<UserResponse>>(this.api));
  }

  updateMe(request: UpdateProfileRequest): Observable<UserProfile> {
    return this.profile(this.http.patch<ApiResponse<UserResponse>>(this.api, request));
  }

  uploadAvatar(file: File): Observable<UserProfile> {
    const body = new FormData();
    body.append('file', file);
    return this.profile(this.http.put<ApiResponse<UserResponse>>(`${this.api}/avatar`, body));
  }

  deleteAvatar(): Observable<UserProfile> {
    return this.profile(this.http.delete<ApiResponse<UserResponse>>(`${this.api}/avatar`));
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.api}/password`, request).pipe(map(() => void 0));
  }

  private profile(source: Observable<ApiResponse<UserResponse>>): Observable<UserProfile> {
    return source.pipe(
      map(response => UserMapper.fromResponse(response.data)),
      tap(user => this.auth.updateProfile(user)),
    );
  }
}
