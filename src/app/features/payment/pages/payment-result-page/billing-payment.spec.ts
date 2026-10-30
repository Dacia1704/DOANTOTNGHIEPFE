import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PaymentService } from '@services/payment.service';
import { SubscriptionService } from '@services/subscription.service';
import { BoostService } from '@services/boost.service';
import { AuthService } from '@services/auth.service';
import { RoleCode } from '@model/auth/auth.model';
import { Payment, PaymentCheck } from '@model/billing/billing.model';
import { PaymentResultPageComponent } from './payment-result-page.component';

registerLocaleData(localeVi);
describe('Billing payment confirmation', () => {
  afterEach(() => vi.useRealTimers());
  function setup(status = 'PENDING', requiresReview = false, missing = false) {
    const payment = {
      id: 'payment',
      type: 'SERVICE_PACKAGE',
      targetId: 'order',
      merchantOrderId: 'reference',
      amount: 250000,
      status,
      requiresReview,
      expiresAt: new Date(Date.now() + 600000),
      paidAt: null,
      reviewReason: requiresReview ? 'LATE_PAYMENT' : null,
      invoiceId: null,
    } as Payment;
    const api = {
      get: vi.fn(() => of(payment)),
      remember: vi.fn(),
      resolve: vi.fn(() => null),
      invoice: vi.fn(() => throwError(() => ({ status: 404 }))),
      check: vi.fn(() =>
        of({
          payment,
          providerResponseCode: '00',
          providerTransactionStatus: '01',
          message: 'Chưa hoàn tất',
        }),
      ),
    };
    const subscriptions = {
      order: vi.fn(() =>
        of({
          status: 'AWAITING_ADMIN_CONFIRMATION',
          rights: { packageName: 'Gói đã mua' },
          durationMonths: 3,
          appliedAt: null,
        }),
      ),
      current: vi.fn(() =>
        of({ rights: { packageName: 'Gói hiện tại' }, canSubmitListings: true }),
      ),
    };
    const boosts = { all: vi.fn(() => of([])) };
    TestBed.configureTestingModule({
      imports: [PaymentResultPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(missing ? {} : { paymentId: 'payment' }),
              queryParamMap: convertToParamMap({
                vnp_ResponseCode: '00',
                vnp_TransactionStatus: '00',
                vnp_TxnRef: 'unknown',
              }),
            },
          },
        },
        { provide: AuthService, useValue: { primaryRole: () => RoleCode.LANDLORD } },
        { provide: PaymentService, useValue: api },
        { provide: SubscriptionService, useValue: subscriptions },
        { provide: BoostService, useValue: boosts },
      ],
    });
    const fixture = TestBed.createComponent(PaymentResultPageComponent);
    return { fixture, page: fixture.componentInstance, api, subscriptions, boosts, payment };
  }
  it('does not trust success query parameters when the server still reports PENDING', () => {
    const { fixture, page } = setup();
    fixture.detectChanges();
    expect(page.payment()?.status).toBe('PENDING');
    expect(page.title()).toContain('Đang chờ');
    expect(fixture.nativeElement.textContent).not.toContain('Thanh toán thành công');
  });
  it('does not pick a last transaction when the merchant reference cannot be recovered', () => {
    const { fixture, page, api } = setup('PENDING', false, true);
    fixture.detectChanges();
    expect(page.missing).toBe(true);
    expect(api.get).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Mở lịch sử thanh toán');
  });
  it('shows successful CHANGE as awaiting admin rather than applied rights', () => {
    const { fixture, page } = setup('SUCCESS');
    fixture.detectChanges();
    expect(page.title()).toContain('chờ xác nhận đổi gói');
    expect(fixture.nativeElement.textContent).toContain('Quyền mới chưa áp dụng');
    expect(fixture.nativeElement.textContent).not.toContain('Đã áp dụng lúc');
  });
  it('shows review separately even when payment status is SUCCESS', () => {
    const { fixture, page } = setup('SUCCESS', true);
    fixture.detectChanges();
    expect(page.title()).toContain('cần đối soát');
    expect(fixture.nativeElement.textContent).toContain('Chưa xác nhận cấp quyền');
  });
  it('shows an applied immediate upgrade with the preserved expiration date', () => {
    const { fixture, page, subscriptions } = setup('SUCCESS');
    subscriptions.order.mockReturnValue(
      of({
        status: 'APPLIED',
        type: 'CHANGE',
        immediateUpgrade: true,
        rights: { packageName: 'Gói nâng cấp' },
        durationMonths: 12,
        appliedAt: null,
        endAt: new Date('2027-02-01T00:00:00+07:00'),
      }),
    );
    page.loadRights();
    fixture.detectChanges();
    expect(page.title()).toBe('Nâng gói thành công');
    expect(fixture.nativeElement.textContent).toContain('giữ nguyên hạn tổng');
    expect(fixture.nativeElement.textContent).toContain('00:00 1/2/27');
    expect(fixture.nativeElement.textContent).not.toContain('đang chờ admin');
  });
  it('shows a new downgraded order as scheduled without an admin step', () => {
    const { fixture, page, subscriptions } = setup('SUCCESS');
    subscriptions.order.mockReturnValue(
      of({
        status: 'SCHEDULED',
        type: 'CHANGE',
        immediateUpgrade: false,
        rights: { packageName: 'Gói kỳ sau' },
        durationMonths: 3,
        appliedAt: null,
      }),
    );
    page.loadRights();
    fixture.detectChanges();
    expect(page.title()).toBe('Đã thanh toán, đã xếp lịch đổi gói');
    expect(fixture.nativeElement.textContent).not.toContain('đang chờ admin');
  });
  it('does not treat a successful QueryDr request as successful payment', () => {
    vi.useFakeTimers();
    const { page, api } = setup();
    vi.advanceTimersByTime(0);
    page.check();
    page.check();
    expect(api.check).toHaveBeenCalledTimes(1);
    expect(page.payment()?.status).toBe('PENDING');
  });
  it('preserves the known result when QueryDr fails', () => {
    const { page, api } = setup('SUCCESS');
    api.check.mockReturnValue(throwError(() => ({ status: 502 })));
    page.check();
    expect(page.payment()?.status).toBe('SUCCESS');
    expect(page.error()).toContain('Kết quả đã ghi nhận được giữ nguyên');
  });
  it('refreshes applied rights on explicit checks even if SUCCESS has not changed', () => {
    const { page, subscriptions } = setup('SUCCESS');
    subscriptions.order.mockReturnValue(
      of({
        status: 'SCHEDULED',
        rights: { packageName: 'Gói đã mua' },
        durationMonths: 3,
        appliedAt: null,
      }),
    );
    page.check();
    expect(page.order()?.status).toBe('SCHEDULED');
    expect(subscriptions.order).toHaveBeenCalledTimes(2);
  });
  it('automatically confirms payment without clicking and refreshes invoice and rights', () => {
    vi.useFakeTimers();
    const { page, api, subscriptions, payment } = setup();
    api.check.mockReturnValue(
      of({
        payment: { ...payment, status: 'SUCCESS' },
        providerResponseCode: '00',
        providerTransactionStatus: '00',
        message: 'Đã xác nhận',
      }),
    );
    vi.advanceTimersByTime(0);
    expect(api.check).toHaveBeenCalledExactlyOnceWith('payment');
    expect(page.payment()?.status).toBe('SUCCESS');
    expect(api.invoice).toHaveBeenCalledTimes(2);
    expect(subscriptions.order).toHaveBeenCalledTimes(2);
    expect(page.verifying()).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(api.check).toHaveBeenCalledTimes(1);
  });
  it('skips automatic QueryDr when the backend already reports success', () => {
    vi.useFakeTimers();
    const { api } = setup('SUCCESS');
    vi.advanceTimersByTime(60000);
    expect(api.check).not.toHaveBeenCalled();
  });
  it('checks expired payments automatically to recover a late confirmation', () => {
    vi.useFakeTimers();
    const { page, api, payment } = setup('EXPIRED');
    api.check.mockReturnValue(
      of({
        payment: { ...payment, status: 'SUCCESS', requiresReview: true },
        providerResponseCode: '00',
        providerTransactionStatus: '00',
        message: 'Cần đối soát',
      }),
    );
    vi.advanceTimersByTime(0);
    expect(page.payment()?.status).toBe('SUCCESS');
    expect(page.title()).toContain('cần đối soát');
    expect(page.verifying()).toBe(false);
  });
  it('retries transient QueryDr failures without replacing the known status', () => {
    vi.useFakeTimers();
    const { page, api, payment } = setup();
    api.check.mockReturnValueOnce(throwError(() => ({ status: 502 })));
    vi.advanceTimersByTime(0);
    expect(page.payment()?.status).toBe('PENDING');
    expect(page.error()).toContain('Kết quả đã ghi nhận được giữ nguyên');
    api.check.mockReturnValue(
      of({
        payment: { ...payment, status: 'SUCCESS' },
        providerResponseCode: '00',
        providerTransactionStatus: '00',
        message: 'Đã xác nhận',
      }),
    );
    vi.advanceTimersByTime(10000);
    expect(page.payment()?.status).toBe('SUCCESS');
    expect(page.error()).toBe('');
  });
  it('does not overlap QueryDr requests and cancels an in-flight request on navigation', () => {
    vi.useFakeTimers();
    const { fixture, api } = setup();
    const pending = new Subject<PaymentCheck>();
    api.check.mockReturnValue(pending);
    vi.advanceTimersByTime(10000);
    expect(api.check).toHaveBeenCalledTimes(1);
    expect(pending.observed).toBe(true);
    fixture.destroy();
    expect(pending.observed).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(api.check).toHaveBeenCalledTimes(1);
  });
  it('bounds automatic QueryDr retries to six attempts in one minute', () => {
    vi.useFakeTimers();
    const { fixture, api } = setup();
    vi.advanceTimersByTime(61000);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.check).toHaveBeenCalledTimes(6);
    expect(fixture.componentInstance.verifying()).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(api.check).toHaveBeenCalledTimes(6);
    fixture.destroy();
    vi.advanceTimersByTime(60000);
    expect(api.check).toHaveBeenCalledTimes(6);
  });
});
