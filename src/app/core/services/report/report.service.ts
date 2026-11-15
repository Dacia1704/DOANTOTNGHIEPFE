import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { ReportMapper } from '@model/report/report.mapper';
import { ReportReason, ReportStatus, ReportTargetType } from '@model/report/report.model';
import {
  ReportResponse,
  ReportSanctionOptionsResponse,
  ReportDetailResponse,
  ReportEvidenceResponse,
  ReportListingResponse,
} from '@model/report/response/report-response';
import { ReportCreateRequest } from '@model/report/request/report-request';
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  reasons(targetType: ReportTargetType) {
    return this.http
      .get<ApiResponse<ReportReason[]>>(`${this.api}/reports/reasons`, { params: { targetType } })
      .pipe(map((r) => [...r.data]));
  }
  create(body: ReportCreateRequest) {
    return this.http
      .post<ApiResponse<ReportResponse>>(`${this.api}/reports`, body)
      .pipe(map((r) => ReportMapper.fromResponse(r.data)));
  }
  list(admin: boolean, page = 0, size = 10, status = '', reasonCode = '') {
    const params: Record<string, string | number> = { page, size };
    if (status) params['status'] = status;
    if (admin && reasonCode) params['reasonCode'] = reasonCode;
    return this.http
      .get<ApiResponse<PageResponse<ReportResponse>>>(
        `${this.api}/${admin ? 'admin/reports' : 'reports/mine'}`,
        { params },
      )
      .pipe(
        map((r) => ({ ...r.data, data: r.data.data.map((x) => ReportMapper.fromResponse(x)) })),
      );
  }
  detail(id: string) {
    return this.http
      .get<ApiResponse<ReportDetailResponse>>(`${this.api}/reports/${encodeURIComponent(id)}`)
      .pipe(map((r) => ReportMapper.detail(r.data)));
  }
  listingDetail(reportId: string, listingId: string) {
    return this.http
      .get<ApiResponse<ReportListingResponse>>(
        `${this.api}/admin/reports/${encodeURIComponent(reportId)}/listings/${encodeURIComponent(listingId)}`,
      )
      .pipe(map((r) => ReportMapper.listing(r.data)));
  }
  summary() {
    return this.http
      .get<ApiResponse<Record<ReportStatus, number>>>(`${this.api}/admin/reports/summary`)
      .pipe(map((r) => ({ ...r.data })));
  }
  sanctionOptions(id: string) {
    return this.http
      .get<ApiResponse<ReportSanctionOptionsResponse>>(
        `${this.api}/admin/reports/${encodeURIComponent(id)}/sanction-options`,
      )
      .pipe(map((r) => r.data));
  }
  action(
    id: string,
    action: 'assign' | 'resolve' | 'reject',
    resolutionNote = '',
    relatedListingId?: string,
  ) {
    return this.http
      .post<ApiResponse<ReportResponse>>(
        `${this.api}/admin/reports/${encodeURIComponent(id)}/${action}`,
        action === 'assign'
          ? {}
          : { resolutionNote, ...(relatedListingId ? { relatedListingId } : {}) },
      )
      .pipe(map((r) => ReportMapper.fromResponse(r.data)));
  }
  upload(id: string, file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<ApiResponse<ReportEvidenceResponse>>(
        `${this.api}/reports/${encodeURIComponent(id)}/evidences`,
        body,
      )
      .pipe(map((r) => ReportMapper.evidence(r.data)));
  }
  content(id: string, evidenceId: string) {
    return this.http.get(
      `${this.api}/reports/${encodeURIComponent(id)}/evidences/${encodeURIComponent(evidenceId)}/content`,
      { responseType: 'blob' },
    );
  }
}
