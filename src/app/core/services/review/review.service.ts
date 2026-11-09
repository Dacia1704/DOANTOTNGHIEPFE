import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { ReviewType } from '@model/review/review.model';
import { ReviewMapper } from '@model/review/review.mapper';
import { ReviewCreateRequest, ReviewVisibilityRequest } from '@model/review/request/review-request';
import {
  ReviewDetailResponse,
  ReviewEligibilityResponse,
  ReviewResponse,
  ReceivedReviewResponse,
} from '@model/review/response/review-response';

const PATHS: Record<ReviewType, string> = {
  ROOM: 'rooms',
  LANDLORD: 'landlords',
  TENANT: 'tenants',
};
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;
  eligibility(id: string) {
    return this.http
      .get<ApiResponse<ReviewEligibilityResponse>>(
        `${this.api}/rental-agreements/${encodeURIComponent(id)}/review-eligibility`,
      )
      .pipe(map((r) => ReviewMapper.eligibility(r.data)));
  }
  create(type: ReviewType, body: ReviewCreateRequest) {
    return this.http
      .post<ApiResponse<ReviewResponse>>(`${this.api}/reviews/${PATHS[type]}`, body)
      .pipe(map((r) => ReviewMapper.fromResponse(r.data)));
  }
  list(
    mode: 'mine' | 'received' | 'admin',
    type: ReviewType,
    page = 0,
    size = 10,
    hidden = '',
    targetId = '',
  ) {
    let params = new HttpParams().set('type', type).set('page', page).set('size', size);
    if (mode === 'admin' && hidden !== '') params = params.set('hidden', hidden);
    if (mode === 'admin' && targetId) params = params.set('targetId', targetId);
    if (mode === 'received') {
      return this.http
        .get<ApiResponse<PageResponse<ReceivedReviewResponse>>>(`${this.api}/landlord/reviews`, {
          params,
        })
        .pipe(map((r) => ({ ...r.data, data: r.data.data.map((x) => ReviewMapper.received(x)) })));
    }
    return this.http
      .get<ApiResponse<PageResponse<ReviewDetailResponse>>>(
        `${this.api}/${mode === 'admin' ? 'admin/reviews' : 'reviews/mine'}`,
        { params },
      )
      .pipe(map((r) => ({ ...r.data, data: r.data.data.map((x) => ReviewMapper.detail(x)) })));
  }
  tenant(id: string, page = 0) {
    return this.http
      .get<ApiResponse<PageResponse<ReviewResponse>>>(
        `${this.api}/tenants/${encodeURIComponent(id)}/reviews`,
        { params: { page, size: 10 } },
      )
      .pipe(
        map((r) => ({ ...r.data, data: r.data.data.map((x) => ReviewMapper.fromResponse(x)) })),
      );
  }
  reply(reviewType: ReviewType, id: string, reply: string) {
    return this.http
      .put<ApiResponse<ReviewResponse>>(
        `${this.api}/reviews/${PATHS[reviewType]}/${encodeURIComponent(id)}/reply`,
        { reply },
      )
      .pipe(map((r) => ReviewMapper.fromResponse(r.data)));
  }
  visibility(type: ReviewType, id: string, body: ReviewVisibilityRequest) {
    return this.http
      .patch<ApiResponse<ReviewDetailResponse>>(
        `${this.api}/admin/reviews/${type}/${encodeURIComponent(id)}/visibility`,
        body,
      )
      .pipe(map((r) => ReviewMapper.detail(r.data)));
  }
}
