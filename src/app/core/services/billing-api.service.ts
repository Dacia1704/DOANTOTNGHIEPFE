import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { BillingMapper } from '@model/billing/billing.mapper';
import { BillingResponse } from '@model/billing/response/billing-response';
import { ResultPage } from '@model/billing/billing.model';

/** Shared transport; feature services expose domain models rather than JSON DTOs. */
@Injectable({ providedIn: 'root' })
export class BillingApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  get<T>(path: string): Observable<T> {
    return this.http
      .get<ApiResponse<BillingResponse<T>>>(`${this.api}/${path}`)
      .pipe(map((res) => BillingMapper.fromResponse<T>(res.data)));
  }
  page<T>(path: string, page = 0, includeInactive?: boolean, filters: Record<string, string> = {}): Observable<ResultPage<T>> {
    const params: Record<string, string | number | boolean> = { ...filters, page, size: 10 };
    if (includeInactive !== undefined) params['includeInactive'] = includeInactive;
    return this.http
      .get<ApiResponse<PageResponse<BillingResponse<T>>>>(`${this.api}/${path}`, { params })
      .pipe(map((res) => BillingMapper.page<T>(res.data)));
  }
  all<T>(path: string, includeInactive?: boolean): Observable<T[]> {
    return this.page<T>(path, 0, includeInactive).pipe(
      expand((page) =>
        page.page + 1 < page.totalPages
          ? this.page<T>(path, page.page + 1, includeInactive)
          : EMPTY,
      ),
      reduce((items, page) => [...items, ...page.items], [] as T[]),
    );
  }
  send<T>(
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body: unknown = null,
  ): Observable<T> {
    return this.http
      .request<ApiResponse<BillingResponse<T>>>(method, `${this.api}/${path}`, { body })
      .pipe(map((res) => BillingMapper.fromResponse<T>(res.data)));
  }
}
