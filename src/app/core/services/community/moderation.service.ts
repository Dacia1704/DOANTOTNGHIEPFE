import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '@model/api-response';
import { ModerationRule, ModerationStatus } from '@model/community/community.model';
import { ModerationCaseResponse } from '@model/community/response/community-response';
import { CommunityMapper } from '@model/community/community.mapper';
@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/admin/moderation`;
  rules() {
    return this.http
      .get<ApiResponse<ModerationRule[]>>(`${this.api}/rules`)
      .pipe(map((r) => r.data));
  }
  saveRule(rule: ModerationRule) {
    const request = rule.id
      ? this.http.put<ApiResponse<ModerationRule>>(`${this.api}/rules/${rule.id}`, rule)
      : this.http.post<ApiResponse<ModerationRule>>(`${this.api}/rules`, rule);
    return request.pipe(map((r) => r.data));
  }
  cases(resolved: boolean, page = 0) {
    return this.http
      .get<ApiResponse<ModerationCaseResponse[]>>(`${this.api}/cases`, {
        params: { resolved, page },
      })
      .pipe(map((r) => r.data.map(CommunityMapper.moderationCase)));
  }
  decide(id: string, status: ModerationStatus, reason: string, expectedVersion: number) {
    return this.http.post(`${this.api}/cases/${id}/decisions`, { status, reason, expectedVersion });
  }
  test(scope: string, text: string) {
    return this.http
      .post<ApiResponse<{ status: ModerationStatus; reason: string }>>(`${this.api}/rules/test`, {
        scope,
        text,
      })
      .pipe(map((r) => r.data));
  }
}
