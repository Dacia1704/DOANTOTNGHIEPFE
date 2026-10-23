import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { Province, Ward, WardRequest } from '@model/administrative-unit.model';

@Injectable({ providedIn: 'root' })
export class AdministrativeUnitService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  provinces() {
    return this.http.get<ApiResponse<Province[]>>(`${this.api}/provinces`).pipe(map(r => r.data));
  }

  list(q: string, provinceId: string, page: number, size: number) {
    const params: Record<string, string | number> = { page, size };
    if (q.trim()) params['q'] = q.trim();
    if (provinceId) params['provinceId'] = provinceId;
    return this.http.get<ApiResponse<PageResponse<Ward>>>(`${this.api}/wards`, { params }).pipe(map(r => r.data));
  }

  get(id: string) {
    return this.http.get<ApiResponse<Ward>>(`${this.api}/wards/${encodeURIComponent(id)}`).pipe(map(r => r.data));
  }

  create(request: WardRequest) {
    return this.http.post<ApiResponse<Ward>>(`${this.api}/wards`, request).pipe(map(r => r.data));
  }

  update(id: string, request: WardRequest) {
    return this.http.put<ApiResponse<Ward>>(`${this.api}/wards/${encodeURIComponent(id)}`, request).pipe(map(r => r.data));
  }

  delete(id: string) {
    return this.http.delete<unknown>(`${this.api}/wards/${encodeURIComponent(id)}`);
  }
}
