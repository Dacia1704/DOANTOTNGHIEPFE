import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '@model/api-response';

export interface NearbyPlace {
  id: string;
  name: string;
  category: string;
  address: string | null;
  latitude: number;
  longitude: number;
}
export interface TenantPreferences {
  tenantType: string | null;
  occupants: number | null;
  moveInDate: string | null;
  desiredProvinceId: string | null;
  wardIds: string[];
  desiredRoomTypeId: string | null;
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  anchorPlaceId: string | null;
  anchorLabel: string | null;
  anchorLatitude: number | null;
  anchorLongitude: number | null;
  maxDistanceKm: number | null;
  priceTolerancePct: number;
  topPriority: string | null;
  note: string | null;
  allowPersonalization: boolean;
  amenityIds: string[];
  requiredAmenityIds: string[];
}
@Injectable({ providedIn: 'root' })
export class TenantPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/users/me/tenant-profile`;
  get() {
    return this.http.get<ApiResponse<TenantPreferences | null>>(this.url).pipe(map((r) => r.data));
  }
  save(body: TenantPreferences) {
    return this.http.put<ApiResponse<TenantPreferences>>(this.url, body).pipe(map((r) => r.data));
  }
  places(q = '', category = '') {
    return this.http
      .get<ApiResponse<NearbyPlace[]>>(`${environment.apiUrl}/nearby-places`, {
        params: { q, category },
      })
      .pipe(map((r) => r.data));
  }
}
