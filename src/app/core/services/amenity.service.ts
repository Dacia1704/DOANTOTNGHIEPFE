import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { AmenityResponse } from '@model/amenity/response/amenity-response';
import { CreateAmenityRequest } from '@model/amenity/request/create-amenity-request';
import { UpdateAmenityRequest } from '@model/amenity/request/update-amenity-request';
import { Amenity, AmenityList } from '@model/amenity/amenity.model';
import { AmenityMapper } from '@model/amenity/amenity.mapper';

@Injectable({ providedIn: 'root' })
export class AmenityService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/amenities`;

  getAmenities(page = 0, size = 10): Observable<AmenityList> {
    const params: Record<string, number> = { page, size };
    return this.http
      .get<ApiResponse<PageResponse<AmenityResponse>>>(this.api, { params })
      .pipe(
        map(res => ({
          items: AmenityMapper.fromResponseList(res.data.data),
          page: res.data.currentPage,
          totalPages: res.data.totalPages,
          total: res.data.totalElements,
        })),
      );
  }

  getAllAmenities(): Observable<Amenity[]> {
    return this.getAmenities(0, 100).pipe(map(res => res.items));
  }

  getAmenityById(id: string): Observable<Amenity> {
    return this.http
      .get<ApiResponse<AmenityResponse>>(`${this.api}/${encodeURIComponent(id)}`)
      .pipe(map(res => AmenityMapper.fromResponse(res.data)));
  }

  createAmenity(request: CreateAmenityRequest): Observable<Amenity> {
    return this.http
      .post<ApiResponse<AmenityResponse>>(this.api, request)
      .pipe(map(res => AmenityMapper.fromResponse(res.data)));
  }

  updateAmenity(id: string, request: UpdateAmenityRequest): Observable<Amenity> {
    return this.http
      .put<ApiResponse<AmenityResponse>>(`${this.api}/${encodeURIComponent(id)}`, request)
      .pipe(map(res => AmenityMapper.fromResponse(res.data)));
  }

  deleteAmenity(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.api}/${encodeURIComponent(id)}`)
      .pipe(map(() => void 0));
  }
}
