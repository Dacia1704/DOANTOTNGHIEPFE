import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '@model/api-response';
import { AdminDashboardResponse } from '@model/dashboard/response/admin-dashboard-response';
import { AdminDashboardMapper } from '@model/dashboard/admin-dashboard.mapper';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/admin/dashboard`;

  overview(from: string, to: string) {
    return this.http
      .get<ApiResponse<AdminDashboardResponse>>(this.api, {
        params: { from, to },
      })
      .pipe(map((response) => AdminDashboardMapper.fromResponse(response.data)));
  }
}
