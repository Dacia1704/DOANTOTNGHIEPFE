import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { RoomResponse, RoomImageResponse } from '@model/room/response/room-response';
import { CreateRoomRequest } from '@model/room/request/create-room-request';
import { UpdateRoomRequest } from '@model/room/request/update-room-request';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { Room, RoomImage, RoomListResult } from '@model/room/room.model';
import { RoomMapper } from '@model/room/room.mapper';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/rooms`;

  /** Lọc phòng của chủ trọ đang đăng nhập (LANDLORD only). */
  filterMyRooms(query: RoomQueryParams = {}): Observable<RoomListResult> {
    const params: Record<string, string | number> = { page: query.page ?? 0, size: query.size ?? 12 };
    if (query.roomTypeName) params['roomTypeName'] = query.roomTypeName;
    if (query.provinceId) params['provinceId'] = query.provinceId;
    if (query.wardId) params['wardId'] = query.wardId;
    if (query.rentalStatus) params['rentalStatus'] = query.rentalStatus;
    if (query.minPrice != null) params['minPrice'] = query.minPrice;
    if (query.maxPrice != null) params['maxPrice'] = query.maxPrice;
    const httpParams = query.amenityNames?.length
      ? query.amenityNames.reduce((current, name) => current.append('amenityNames', name), new HttpParams({ fromObject: params }))
      : new HttpParams({ fromObject: params });
    return this.http.get<ApiResponse<PageResponse<RoomResponse>>>(`${this.api}/mine/filter`, { params: httpParams })
      .pipe(map(res => this.toRoomList(res.data)));
  }

  /** Alias cho filterMyRooms. */
  filterRooms(query: RoomQueryParams = {}): Observable<RoomListResult> {
    return this.filterMyRooms(query);
  }

  /** Alias cho getMyRooms. */
  getRooms(page = 0, size = 10): Observable<RoomListResult> {
    return this.getMyRooms(page, size);
  }

  private toRoomList(page: PageResponse<RoomResponse>): RoomListResult {
    return {
      items: RoomMapper.fromResponseList(page.data),
      page: page.currentPage,
      totalPages: page.totalPages,
      total: page.totalElements,
    };
  }

  getMyRooms(page = 0, size = 10): Observable<RoomListResult> {
    const params: Record<string, number> = { page, size };
    return this.http
      .get<ApiResponse<PageResponse<RoomResponse>>>(`${this.api}/mine`, { params })
      .pipe(
        map(res => ({
          items: RoomMapper.fromResponseList(res.data.data),
          page: res.data.currentPage,
          totalPages: res.data.totalPages,
          total: res.data.totalElements,
        })),
      );
  }

  getRoomById(id: string): Observable<Room> {
    return this.http
      .get<ApiResponse<RoomResponse>>(`${this.api}/${encodeURIComponent(id)}`)
      .pipe(map(res => RoomMapper.fromResponse(res.data)));
  }

  createRoom(request: CreateRoomRequest, files?: File[]): Observable<Room> {
    const formData = new FormData();
    const jsonBlob = new Blob([JSON.stringify(request)], { type: 'application/json' });
    formData.append('room', jsonBlob);

    if (files && files.length > 0) {
      for (const file of files) {
        formData.append('files', file);
      }
    }

    return this.http
      .post<ApiResponse<RoomResponse>>(this.api, formData)
      .pipe(map(res => RoomMapper.fromResponse(res.data)));
  }

  updateRoom(id: string, request: UpdateRoomRequest): Observable<Room> {
    return this.http
      .put<ApiResponse<RoomResponse>>(`${this.api}/${encodeURIComponent(id)}`, request)
      .pipe(map(res => RoomMapper.fromResponse(res.data)));
  }

  deleteRoom(id: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.api}/${encodeURIComponent(id)}`)
      .pipe(map(() => void 0));
  }

  uploadImages(roomId: string, files: File[]): Observable<RoomImage[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    return this.http
      .post<ApiResponse<RoomImageResponse[]>>(`${this.api}/${encodeURIComponent(roomId)}/images`, formData)
      .pipe(
        map(res =>
          (res.data || []).map(img => ({
            id: img.id,
            url: img.url,
            sortOrder: img.sortOrder ?? 0,
            createdAt: img.createdAt ? new Date(img.createdAt) : null,
          })),
        ),
      );
  }

  deleteImage(roomId: string, imageId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.api}/${encodeURIComponent(roomId)}/images/${encodeURIComponent(imageId)}`)
      .pipe(map(() => void 0));
  }
}

