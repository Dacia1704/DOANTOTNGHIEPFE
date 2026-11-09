import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import {
  PublicListing,
  PublicListingList,
  ListingPriceStatistics,
} from '@model/public-listing/public-listing.model';
import { PublicListingResponse } from '@model/public-listing/response/public-listing-response';
import { PublicListingMapper } from '@model/public-listing/public-listing.mapper';
@Injectable({ providedIn: 'root' })
export class PublicListingService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/listings`;
  search(query: RoomQueryParams): Observable<PublicListingList> {
    const params = this.filterParams(query)
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 12);
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

  searchMap(query: RoomQueryParams): Observable<PublicListing[]> {
    return this.http
      .get<ApiResponse<PublicListingResponse[]>>(`${this.api}/map`, {
        params: this.filterParams(query),
      })
      .pipe(map(({ data }) => data.map((dto) => PublicListingMapper.fromResponse(dto))));
  }
  priceStatistics(provinceId = '', wardId = ''): Observable<ListingPriceStatistics[]> {
    let params = new HttpParams();
    if (provinceId) params = params.set('provinceId', provinceId);
    if (wardId) params = params.set('wardId', wardId);
    return this.http
      .get<ApiResponse<ListingPriceStatistics[]>>(`${this.api}/price-statistics`, { params })
      .pipe(map((response) => response.data));
  }

  private filterParams(query: RoomQueryParams): HttpParams {
    let params = new HttpParams();
    for (const key of [
      'roomTypeName',
      'provinceId',
      'wardId',
      'rentalStatus',
      'minPrice',
      'maxPrice',
      'latitude',
      'longitude',
      'radiusKm',
      'south',
      'north',
      'west',
      'east',
    ] as const) {
      const value = query[key];
      if (value != null && value !== '') params = params.set(key, value);
    }
    for (const name of query.amenityNames ?? []) params = params.append('amenityNames', name);
    return params;
  }
  getById(id: string): Observable<PublicListing> {
    return this.http
      .get<ApiResponse<PublicListingResponse>>(`${this.api}/${encodeURIComponent(id)}`)
      .pipe(map((response) => PublicListingMapper.fromResponse(response.data)));
  }

  revealPhone(id: string): Observable<string | null> {
    return this.http
      .post<ApiResponse<{ phone: string | null }>>(
        `${this.api}/${encodeURIComponent(id)}/reveal-phone`,
        {},
      )
      .pipe(map((response) => response.data.phone));
  }
}
