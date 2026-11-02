import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce, shareReplay, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { RoomTypeResponse } from '@model/room-type/response/room-type-response';
import { RoomTypeCategoryResponse } from '@model/room-type/response/room-type-category-response';
import { CreateRoomTypeRequest } from '@model/room-type/request/create-room-type-request';
import { UpdateRoomTypeRequest } from '@model/room-type/request/update-room-type-request';
import { RoomType, RoomTypeCategory, RoomTypeList } from '@model/room-type/room-type.model';
import { RoomTypeMapper } from '@model/room-type/room-type.mapper';

@Injectable({ providedIn: 'root' })
export class RoomTypeService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/room-types`;
  private allRoomTypes$?: Observable<RoomType[]>;

  getRoomTypes(page = 0, size = 10): Observable<RoomTypeList> {
    const params: Record<string, number> = { page, size };
    return this.http
      .get<ApiResponse<PageResponse<RoomTypeResponse>>>(this.api, { params })
      .pipe(
        map(res => ({
          items: RoomTypeMapper.fromResponseList(res.data.data),
          page: res.data.currentPage,
          totalPages: res.data.totalPages,
          total: res.data.totalElements,
        })),
      );
  }

  getAllRoomTypes(name?: string, parentId?: string): Observable<RoomType[]> {
    if (!name?.trim() && !parentId && this.allRoomTypes$) return this.allRoomTypes$;
    const fetchPage = (page: number) => {
      const params: Record<string, string | number> = { page, size: 100 };
      if (name?.trim()) params['name'] = name.trim();
      if (parentId) params['parentId'] = parentId;
      return this.http.get<ApiResponse<PageResponse<RoomTypeResponse>>>(`${this.api}/filter`, { params });
    };
    const request$ = fetchPage(0).pipe(
      expand(response => response.data.currentPage + 1 < response.data.totalPages
        ? fetchPage(response.data.currentPage + 1)
        : EMPTY),
      reduce((items, response) => [...items, ...RoomTypeMapper.fromResponseList(response.data.data)], [] as RoomType[]),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    if (!name?.trim() && !parentId) this.allRoomTypes$ = request$;
    return request$;
  }

  getCategoriesWithRooms(): Observable<RoomTypeCategory[]> {
    return this.http
      .get<ApiResponse<RoomTypeCategoryResponse[]>>(`${this.api}/categories`)
      .pipe(map(res => RoomTypeMapper.fromCategoryResponseList(res.data)));
  }

  getRoomTypeById(id: string): Observable<RoomType> {
    return this.http
      .get<ApiResponse<RoomTypeResponse>>(`${this.api}/${encodeURIComponent(id)}`)
      .pipe(map(res => RoomTypeMapper.fromResponse(res.data)));
  }

  createRoomType(request: CreateRoomTypeRequest): Observable<RoomType> {
    return this.http
      .post<ApiResponse<RoomTypeResponse>>(this.api, request)
      .pipe(tap(() => this.allRoomTypes$ = undefined), map(res => RoomTypeMapper.fromResponse(res.data)));
  }

  updateRoomType(id: string, request: UpdateRoomTypeRequest): Observable<RoomType> {
    return this.http
      .put<ApiResponse<RoomTypeResponse>>(`${this.api}/${encodeURIComponent(id)}`, request)
      .pipe(tap(() => this.allRoomTypes$ = undefined), map(res => RoomTypeMapper.fromResponse(res.data)));
  }

  deleteRoomType(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.api}/${encodeURIComponent(id)}`)
      .pipe(tap(() => this.allRoomTypes$ = undefined), map(() => void 0));
  }
}
