import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '@model/api-response';
import { RolePermissionMapper } from '@model/role-permission/role-permission.mapper';
import {
  PermissionAuditResponse,
  PermissionChangeResponse,
  RolePermissionMatrixResponse,
} from '@model/role-permission/response/role-permission-response';
import { PermissionChangeRequest } from '@model/role-permission/request/permission-change-request';
@Injectable({ providedIn: 'root' })
export class RolePermissionService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/admin`;
  matrix() {
    return this.http
      .get<ApiResponse<RolePermissionMatrixResponse>>(`${this.api}/role-permissions`)
      .pipe(map((r) => RolePermissionMapper.matrix(r.data)));
  }
  change(roleId: string, permissionId: string, body: PermissionChangeRequest) {
    return this.http
      .patch<ApiResponse<PermissionChangeResponse>>(
        `${this.api}/roles/${encodeURIComponent(roleId)}/permissions/${encodeURIComponent(permissionId)}`,
        body,
      )
      .pipe(map((r) => RolePermissionMapper.change(r.data)));
  }
  audit(page = 0, size = 10) {
    return this.http
      .get<ApiResponse<PermissionAuditResponse[]>>(`${this.api}/role-permissions/audit`, {
        params: { page, size },
      })
      .pipe(map((r) => r.data.map((entry) => RolePermissionMapper.audit(entry))));
  }
}
