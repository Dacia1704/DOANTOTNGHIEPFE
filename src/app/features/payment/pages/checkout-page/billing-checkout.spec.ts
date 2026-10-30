import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PaymentService } from '@services/payment.service';
import { SubscriptionService } from '@services/subscription.service';
import { BoostService } from '@services/boost.service';
import { SubscriptionOrder } from '@model/billing/billing.model';
import { CheckoutPageComponent } from './checkout-page.component';

registerLocaleData(localeVi);
describe('Billing upgrade quotes', () => {
  afterEach(() => vi.useRealTimers());
  function setup(patch: Partial<SubscriptionOrder> = {}) {
    const order = {
      id: 'order',
      type: 'CHANGE',
      status: 'PENDING_PAYMENT',
      immediateUpgrade: true,
      durationMonths: 12,
      price: 27341,
      expiresAt: new Date(Date.now() + 60000),
      endAt: new Date(Date.now() + 86400000 * 72),
      rights: {
        packageName: 'Gói đích',
        maxListings: 20,
        highPrioritySlots: 5,
        lowPrioritySlots: 0,
      },
      ...patch,
    } as SubscriptionOrder;
    const payments = { checkout: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CheckoutPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ type: 'SERVICE_PACKAGE', targetId: 'order' }),
            },
          },
        },
        { provide: PaymentService, useValue: payments },
        { provide: SubscriptionService, useValue: { order: () => of(order) } },
        { provide: BoostService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(CheckoutPageComponent);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, payments };
  }
  it('shows the server prorated charge and does not present the reference term as extra time', () => {
    const { fixture, page } = setup();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('27.341');
    expect(text).toContain('Thời hạn bảng giá tham chiếu');
    expect(text).toContain('giữ nguyên hạn tổng');
    expect(text).not.toContain('Sau khi thanh toán cần admin');
    expect(page.canPay()).toBe(true);
  });
  it('does not call checkout for an upgrade already applied with zero charge', () => {
    const { fixture, page, payments } = setup({ status: 'APPLIED', price: 0 });
    page.pay();
    expect(payments.checkout).not.toHaveBeenCalled();
    expect(page.canPay()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Gói đã được áp dụng');
    expect(fixture.nativeElement.querySelector('button.primary')).toBeNull();
  });
  it('describes downgrade as automatically scheduled without admin approval', () => {
    const { fixture } = setup({ immediateUpgrade: false });
    expect(fixture.nativeElement.textContent).toContain('tự xếp lịch');
    expect(fixture.nativeElement.textContent).toContain('không cần admin');
    expect(fixture.nativeElement.textContent).not.toContain('Thời hạn bảng giá tham chiếu');
  });
  it('uses the shortened server payment deadline for immediate upgrades', () => {
    vi.useFakeTimers();
    const { page, payments } = setup();
    vi.advanceTimersByTime(60001);
    expect(page.canPay()).toBe(false);
    page.pay();
    expect(payments.checkout).not.toHaveBeenCalled();
  });
  it('does not send a zero-amount pending order to VNPay', () => {
    const { page, payments } = setup({ price: 0 });
    page.pay();
    expect(payments.checkout).not.toHaveBeenCalled();
  });
});
