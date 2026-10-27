import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { PublicListing, PublicListingList } from '@model/public-listing/public-listing.model';
import { PublicListingResponse } from '@model/public-listing/response/public-listing-response';
import { PublicListingMapper } from '@model/public-listing/public-listing.mapper';
@Injectable({ providedIn: 'root' })
export class PublicListingService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/listings`;
  search(query: RoomQueryParams): Observable<PublicListingList> {
    let params = new HttpParams().set('page', query.page ?? 0).set('size', query.size ?? 12);
    for (const key of [
      'roomTypeName',
      'provinceId',
      'wardId',
      'rentalStatus',
      'minPrice',
      'maxPrice',
    ] as const) {
      const value = query[key];
      if (value != null && value !== '') params = params.set(key, value);
    }
    for (const name of query.amenityNames ?? []) params = params.append('amenityNames', name);
    return this.http
      .get<ApiResponse<PageResponse<PublicListingResponse>>>(this.api, { params })
      .pipe(
        map(({ data }) => ({
          items: data.data.map((dto) => PublicListingMapper.fromResponse(dto)),
          page: data.currentPage,
          totalPages: data.totalPages,
          total: data.totalElements,
        })),
      );
  }
  getById(id: string): Observable<PublicListing> {
    return this.http
      .get<ApiResponse<PublicListingResponse>>(`${this.api}/${encodeURIComponent(id)}`)
      .pipe(map((response) => PublicListingMapper.fromResponse(response.data)));
  }
}
