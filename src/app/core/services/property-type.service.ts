import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { PropertyType, PropertyTypeList } from '@model/property-type/property-type.model';
import { PropertyTypeResponse } from '@model/property-type/response/property-type-response';
import { PropertyTypeRequest } from '@model/property-type/request/property-type-request';
import { PropertyTypeMapper } from '@model/property-type/property-type.mapper';

@Injectable({ providedIn: 'root' })
export class PropertyTypeService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/property-types`;
  getPage(page = 0, size = 10): Observable<PropertyTypeList> {
    return this.http
      .get<ApiResponse<PageResponse<PropertyTypeResponse>>>(this.api, { params: { page, size } })
      .pipe(
        map(({ data }) => ({
          items: data.data.map((dto) => PropertyTypeMapper.fromResponse(dto)),
          page: data.currentPage,
          totalPages: data.totalPages,
          total: data.totalElements,
        })),
      );
  }
  getAll(): Observable<PropertyType[]> {
    return this.getPage(0, 100).pipe(
      expand((page) =>
        page.page + 1 < page.totalPages ? this.getPage(page.page + 1, 100) : EMPTY,
      ),
      reduce((items, page) => [...items, ...page.items], [] as PropertyType[]),
    );
  }
  create(request: PropertyTypeRequest): Observable<PropertyType> {
    return this.http
      .post<ApiResponse<PropertyTypeResponse>>(this.api, request)
      .pipe(map((res) => PropertyTypeMapper.fromResponse(res.data)));
  }
  update(id: string, request: PropertyTypeRequest): Observable<PropertyType> {
    return this.http
      .put<ApiResponse<PropertyTypeResponse>>(`${this.api}/${encodeURIComponent(id)}`, request)
      .pipe(map((res) => PropertyTypeMapper.fromResponse(res.data)));
  }
  delete(id: string): Observable<void> {
    return this.http.delete(`${this.api}/${encodeURIComponent(id)}`).pipe(map(() => void 0));
  }
}
