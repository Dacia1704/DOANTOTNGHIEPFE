import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BoostService } from './boost.service';
import { PaymentService } from './payment.service';
import { SubscriptionService } from './subscription.service';
import { AuthService } from './auth.service';
import { BillingApiService } from './billing-api.service';
import { Payment, SubscriptionOrder } from '@model/billing/billing.model';
import { environment } from '@environments/environment';

describe('Billing API contracts', () => {
  let http: HttpTestingController;
  let account: string;
  beforeEach(() => {
    account = 'billing-test-a';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { session: () => ({ id: account }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    localStorage.removeItem('trotot_payments:billing-test-a');
    localStorage.removeItem('trotot_payments:billing-test-b');
  });
  afterEach(() => {
    http.verify();
    localStorage.removeItem('trotot_payments:billing-test-a');
    localStorage.removeItem('trotot_payments:billing-test-b');
  });

  it('buys Boost without a listing and sends no price or rights from the client', () => {
    TestBed.inject(BoostService).create({ boostPackageId: 'boost-catalog' }).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/boost-subscriptions`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ boostPackageId: 'boost-catalog' });
    request.flush({ data: { id: 'purchase' } });
  });
  it('keeps server upgrade classification and zero-charge application from the order response', () => {
    let order: SubscriptionOrder | undefined;
    TestBed.inject(SubscriptionService)
      .create({ priceOptionId: 'price', type: 'CHANGE' })
      .subscribe((value) => (order = value));
    const request = http.expectOne(`${environment.apiUrl}/subscriptions/orders`);
    expect(request.request.body).toEqual({ priceOptionId: 'price', type: 'CHANGE' });
    request.flush({
      data: {
        id: 'upgrade',
        immediateUpgrade: true,
        price: 0,
        status: 'APPLIED',
        endAt: '2027-02-01T00:00:00+07:00',
      },
    });
    expect(order?.immediateUpgrade).toBe(true);
    expect(order?.price).toBe(0);
    expect(order?.status).toBe('APPLIED');
    expect(order?.endAt?.toISOString()).toBe('2027-01-31T17:00:00.000Z');
  });

  it('reads several active packages with server counts and Vietnam timestamps', () => {
    const results: unknown[] = [];
    TestBed.inject(BoostService)
      .active()
      .subscribe((items) => results.push(items));
    http.expectOne(`${environment.apiUrl}/boost-subscriptions/active`).flush({
      data: [
        {
          subscription: { id: 'first', endAt: '2026-12-01T12:00:00' },
          remainingHighPrioritySlots: 2,
          remainingLowPrioritySlots: 0,
          allocations: [],
        },
        {
          subscription: { id: 'second', endAt: '2027-01-01T12:00:00+07:00' },
          remainingHighPrioritySlots: 0,
          remainingLowPrioritySlots: 3,
          allocations: [],
        },
      ],
    });
    const groups = results[0] as {
      subscription: { endAt: Date };
      remainingHighPrioritySlots: number;
    }[];
    expect(groups).toHaveLength(2);
    expect(groups[0].subscription.endAt.toISOString()).toBe('2026-12-01T05:00:00.000Z');
    expect(groups[1].subscription.endAt.toISOString()).toBe('2027-01-01T05:00:00.000Z');
    expect(groups[0].remainingHighPrioritySlots).toBe(2);
  });

  it('moves an allocation with one PUT, retaining the old allocation on a 409', () => {
    let failed = false;
    TestBed.inject(BoostService)
      .allocate('listing/1', { boostSubscriptionId: 'destination', level: 1 })
      .subscribe({ error: () => (failed = true) });
    const request = http.expectOne(
      `${environment.apiUrl}/boost-subscriptions/allocations/listing%2F1`,
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ boostSubscriptionId: 'destination', level: 1 });
    http.expectNone((req) => req.method === 'DELETE');
    request.flush({ message: 'BOOST_SLOTS_EXCEEDED' }, { status: 409, statusText: 'Conflict' });
    expect(failed).toBe(true);
  });

  it('releases an allocation using DELETE and accepts data null', () => {
    let result: unknown = 'not completed';
    TestBed.inject(BoostService)
      .release('listing')
      .subscribe((value) => (result = value));
    const request = http.expectOne(`${environment.apiUrl}/boost-subscriptions/allocations/listing`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ data: null });
    expect(result).toBeNull();
  });

  it('loads every page before deriving transaction locks or listing eligibility', () => {
    let results: { id: string }[] = [];
    TestBed.inject(BillingApiService)
      .all<{ id: string }>('subscriptions/orders')
      .subscribe((items) => (results = items));
    http
      .expectOne(
        (req) => req.url.endsWith('/subscriptions/orders') && req.params.get('page') === '0',
      )
      .flush({ data: { data: [{ id: 'old' }], currentPage: 0, totalPages: 2, totalElements: 2 } });
    http
      .expectOne(
        (req) => req.url.endsWith('/subscriptions/orders') && req.params.get('page') === '1',
      )
      .flush({
        data: { data: [{ id: 'scheduled' }], currentPage: 1, totalPages: 2, totalElements: 2 },
      });
    expect(results.map((item) => item.id)).toEqual(['old', 'scheduled']);
  });

  it('recovers multiple payments by merchant reference and isolates accounts', () => {
    const service = TestBed.inject(PaymentService);
    service.remember({
      id: 'p1',
      merchantOrderId: 'ref1',
      type: 'BOOST_PACKAGE',
      targetId: 'b1',
    } as Payment);
    service.remember({
      id: 'p2',
      merchantOrderId: 'ref2',
      type: 'SERVICE_PACKAGE',
      targetId: 'o2',
    } as Payment);
    expect(service.resolve('ref1')).toBe('p1');
    expect(service.resolve('ref2')).toBe('p2');
    account = 'billing-test-b';
    expect(service.resolve('ref1')).toBeNull();
    account = 'billing-test-a';
    expect(service.resolve('ref1')).toBe('p1');
    expect(localStorage.getItem('trotot_payments:billing-test-a')).not.toContain('accessToken');
  });
});
