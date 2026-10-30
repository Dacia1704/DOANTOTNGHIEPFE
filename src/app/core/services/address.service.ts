import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { Province, ProvinceResponse } from '@model/address/province.model';
import { Ward, WardList, WardResponse } from '@model/address/ward.model';
import { AddressMapper } from '@model/address/address.mapper';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getProvinces(): Observable<Province[]> {
    return this.http
      .get<ApiResponse<ProvinceResponse[]>>(`${this.api}/provinces`)
      .pipe(map((res) => AddressMapper.fromProvinceResponseList(res.data)));
  }

  getWards(provinceId?: string, q?: string, page = 0, size = 100): Observable<WardList> {
    const params: Record<string, string | number> = { page, size };
    if (provinceId) params['provinceId'] = provinceId;
    if (q?.trim()) params['q'] = q.trim();

    return this.http
      .get<ApiResponse<PageResponse<WardResponse>>>(`${this.api}/wards`, { params })
      .pipe(
        map((res) => ({
          items: AddressMapper.fromWardResponseList(res.data.data),
          page: res.data.currentPage,
          totalPages: res.data.totalPages,
          total: res.data.totalElements,
        })),
      );
  }

  getAllWards(provinceId: string): Observable<Ward[]> {
    return this.getWards(provinceId, undefined, 0, 100).pipe(
      expand((page) =>
        page.page + 1 < page.totalPages
          ? this.getWards(provinceId, undefined, page.page + 1, 100)
          : EMPTY,
      ),
      reduce((items, page) => [...items, ...page.items], [] as Ward[]),
    );
  }

  getWardById(id: string): Observable<Ward> {
    return this.http
      .get<ApiResponse<WardResponse>>(`${this.api}/wards/${encodeURIComponent(id)}`)
      .pipe(map((res) => AddressMapper.fromWardResponse(res.data)));
  }
}
