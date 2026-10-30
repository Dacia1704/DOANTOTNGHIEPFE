import { PageResponse } from '../api-response';
import { ResultPage } from './billing.model';
import { BillingResponse } from './response/billing-response';

const dateFields = new Set([
  'createdAt',
  'updatedAt',
  'expiresAt',
  'effectiveAt',
  'endAt',
  'appliedAt',
  'confirmedAt',
  'startAt',
  'subscriptionEndsAt',
  'paymentExpiresAt',
  'submittedAt',
  'pendingExpiresAt',
  'publishedAt',
  'paidAt',
  'issuedAt',
]);

export class BillingMapper {
  static fromResponse<T>(response: BillingResponse<T>): T {
    const convert = (value: unknown, key = ''): unknown => {
      if (value == null) return value;
      if (dateFields.has(key) && typeof value === 'string') {
        // API local date-times are defined in Asia/Ho_Chi_Minh, independent of browser timezone.
        const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}+07:00`);
        return Number.isNaN(date.getTime()) ? null : date;
      }
      if (Array.isArray(value)) return value.map((item) => convert(item));
      if (typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, convert(v, k)]));
      return value;
    };
    return convert(response) as T;
  }

  static page<T>(response: PageResponse<BillingResponse<T>>): ResultPage<T> {
    return {
      items: response.data.map((item) => this.fromResponse<T>(item)),
      page: response.currentPage,
      totalPages: response.totalPages,
      total: response.totalElements,
    };
  }
}
