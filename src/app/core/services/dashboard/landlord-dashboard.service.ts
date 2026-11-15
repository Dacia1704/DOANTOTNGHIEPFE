import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '@model/api-response';
import { LandlordDashboardResponse } from '@model/dashboard/response/landlord-dashboard-response';
import { LandlordDashboardMapper } from '@model/dashboard/landlord-dashboard.mapper';

@Injectable({ providedIn: 'root' })
export class LandlordDashboardService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/landlord/dashboard`;

  overview(from: string, to: string) {
    return this.http
      .get<ApiResponse<LandlordDashboardResponse>>(this.api, { params: { from, to } })
      .pipe(map((response) => LandlordDashboardMapper.fromResponse(response.data)));
  }
}
