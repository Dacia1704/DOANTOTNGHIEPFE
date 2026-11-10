import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import {
  RentalAgreement,
  RentalBooking,
  RentalRequest,
  RentalSummary,
} from '@model/rental/rental.model';

@Injectable({ providedIn: 'root' })
export class RentalService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  create(body: RentalBooking) {
    return this.http
      .post<ApiResponse<RentalRequest>>(`${this.base}/rental-requests`, body)
      .pipe(map((r) => r.data));
  }
  requests(owner: boolean, page = 0, filters: Record<string, string> = {}, size = 10) {
    return this.http
      .get<ApiResponse<PageResponse<RentalRequest>>>(
        `${this.base}/${owner ? 'landlord/rental-requests' : 'rental-requests/my'}`,
        { params: { ...filters, page, size } },
      )
      .pipe(map((r) => r.data));
  }
  request(id: string) {
    return this.http
      .get<ApiResponse<RentalRequest>>(`${this.base}/rental-requests/${encodeURIComponent(id)}`)
      .pipe(map((r) => r.data));
  }
  summary() {
    return this.http
      .get<ApiResponse<RentalSummary>>(`${this.base}/rental-requests/my/summary`)
      .pipe(map((r) => r.data));
  }
  agreements(owner: boolean, page = 0, size = 10, filters: Record<string, string> = {}) {
    return this.http
      .get<ApiResponse<PageResponse<RentalAgreement>>>(
        `${this.base}/${owner ? 'landlord/rental-agreements' : 'rental-agreements/my'}`,
        { params: { ...filters, page, size } },
      )
      .pipe(map((r) => r.data));
  }
  agreement(id: string) {
    return this.http
      .get<ApiResponse<RentalAgreement>>(`${this.base}/rental-agreements/${encodeURIComponent(id)}`)
      .pipe(map((r) => r.data));
  }
  requestAction(id: string, action: 'accept' | 'reject' | 'cancel', reason = '') {
    return this.http
      .post<ApiResponse<RentalAgreement & RentalRequest>>(
        `${this.base}/${action === 'cancel' ? '' : 'landlord/'}rental-requests/${encodeURIComponent(id)}/${action}`,
        { reason },
      )
      .pipe(map((r) => r.data));
  }
  agreementAction(id: string, action: 'confirm' | 'decline' | 'checkout', hash?: string) {
    const body =
      action === 'confirm'
        ? { accepted: true, expectedPdfSha256: hash }
        : action === 'checkout'
          ? { handoverConfirmed: true }
          : {};
    return this.http
      .post<ApiResponse<RentalAgreement>>(
        `${this.base}/${action === 'checkout' ? 'landlord/' : ''}rental-agreements/${encodeURIComponent(id)}/${action}`,
        body,
      )
      .pipe(map((r) => r.data));
  }
  pdf(id: string) {
    return this.http.get(`${this.base}/rental-agreements/${encodeURIComponent(id)}/pdf`, {
      responseType: 'blob',
    });
  }
}
