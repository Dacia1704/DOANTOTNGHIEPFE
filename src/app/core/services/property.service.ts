import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { PropertyResponse } from '@model/property/response/property-response';
import { CreatePropertyRequest } from '@model/property/request/create-property-request';
import { Property, PropertyList } from '@model/property/property.model';
import { PropertyMapper } from '@model/property/property.mapper';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/properties`;

  getMine(page = 0, size = 6): Observable<PropertyList> {
    return this.http
      .get<ApiResponse<PageResponse<PropertyResponse>>>(`${this.api}/mine`, {
        params: { page, size },
      })
      .pipe(
        map(({ data }) => ({
          items: data.data.map((dto) => PropertyMapper.fromResponse(dto)),
          page: data.currentPage,
          totalPages: data.totalPages,
          total: data.totalElements,
        })),
      );
  }
  getAllMine(): Observable<Property[]> {
    return this.getMine(0, 100).pipe(
      expand((page) =>
        page.page + 1 < page.totalPages ? this.getMine(page.page + 1, 100) : EMPTY,
      ),
      reduce((items, page) => [...items, ...page.items], [] as Property[]),
    );
  }
  getById(id: string): Observable<Property> {
    return this.http
      .get<ApiResponse<PropertyResponse>>(`${this.api}/${encodeURIComponent(id)}`)
      .pipe(map((res) => PropertyMapper.fromResponse(res.data)));
  }
  create(request: CreatePropertyRequest): Observable<Property> {
    return this.http
      .post<ApiResponse<PropertyResponse>>(this.api, request)
      .pipe(map((res) => PropertyMapper.fromResponse(res.data)));
  }
}
