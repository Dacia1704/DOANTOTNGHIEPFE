import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PaymentService } from '@services/payment.service';
import { Payment, ResultPage } from '@model/billing/billing.model';
import { PaymentManagementComponent } from './payment-management.component';
import { ADMIN_ROUTES } from '../admin.routes';
import { AdminLayout } from '../../../layouts/admin-layout/admin-layout';
import { BreakpointObserver } from '@angular/cdk/layout';

registerLocaleData(localeVi);
const payment: Payment = {
  id: 'payment',
  type: 'SERVICE_PACKAGE',
  targetId: 'order',
  merchantOrderId: 'REF123',
  amount: 250000,
  status: 'SUCCESS',
  paidAt: new Date('2026-11-01T10:00:00+07:00'),
  expiresAt: null,
  requiresReview: true,
  reviewReason: 'PAID_AFTER_DEADLINE',
  invoiceId: 'invoice',
};
const pageOf = (items: Payment[], page = 0, total = items.length): ResultPage<Payment> => ({
  items,
  page,
  total,
  totalPages: Math.ceil(total / 10),
});

describe('Admin payment management', () => {
  async function setup(url = '/admin/payments', all?: Observable<ResultPage<Payment>>) {
    const api = {
      adminList: vi.fn((page = 0) => all ?? of(pageOf([payment], page, 37))),
      review: vi.fn((page = 0) => of(pageOf([payment], page, 24))),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'admin', children: ADMIN_ROUTES }]),
        { provide: PaymentService, useValue: api },
      ],
    });
    const harness = await RouterTestingHarness.create(url);
    const component = harness.routeDebugElement!.componentInstance as PaymentManagementComponent;
    return {
      api,
      harness,
      component,
      router: TestBed.inject(Router),
      root: harness.routeNativeElement!,
    };
  }

  it('loads all admin transactions, displays real queue totals and links to details', async () => {
    const { api, root, component } = await setup();
    expect(api.adminList).toHaveBeenCalledExactlyOnceWith(0);
    expect(api.review).toHaveBeenCalledExactlyOnceWith(0);
    expect(component.allCount()).toBe(37);
    expect(component.reviewCount()).toBe(24);
    expect(root.textContent).toContain('REF123');
    expect(root.textContent).toContain('Thanh toán sau thời hạn');
    expect(root.querySelectorAll('app-billing-status')).toHaveLength(2);
    expect(root.querySelector('a[href="/admin/payments/payment?tab=all"]')).not.toBeNull();
    expect(root.querySelector('a[aria-current="page"]')?.textContent).toContain('Tất cả giao dịch');
  });

  it('changes tabs through the URL, resets pagination, and keeps the review tab in detail links', async () => {
    const { api, harness, component, router } = await setup();
    component.load(2);
    expect(component.page()).toBe(2);
    await router.navigateByUrl('/admin/payments?tab=review');
    harness.detectChanges();
    expect(component.tab()).toBe('review');
    expect(component.page()).toBe(0);
    expect(api.adminList).toHaveBeenCalledTimes(2);
    expect(
      harness.routeNativeElement!.querySelector('a[href="/admin/payments/payment?tab=review"]'),
    ).not.toBeNull();
    component.load(1);
    expect(api.review).toHaveBeenLastCalledWith(1);
  });

  it('redirects the old review URL to the new queue tab', async () => {
    const { api, component, router } = await setup('/admin/payment-review');
    expect(router.url).toBe('/admin/payments?tab=review');
    expect(component.tab()).toBe('review');
    expect(api.adminList).not.toHaveBeenCalled();
    expect(api.review).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('cancels a pending list request when tabs change and ignores its late response', async () => {
    const pending = new Subject<ResultPage<Payment>>();
    const { component, router } = await setup('/admin/payments', pending);
    expect(component.loading()).toBe(true);
    expect(pending.observed).toBe(true);
    await router.navigateByUrl('/admin/payments?tab=review');
    expect(pending.observed).toBe(false);
    pending.next(pageOf([{ ...payment, id: 'stale' }]));
    expect(component.tab()).toBe('review');
    expect(component.items()[0].id).toBe('payment');
  });

  it('keeps all transactions usable when the separate queue count cannot be fetched', async () => {
    const { api, component } = await setup();
    api.review.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    component.load();
    expect(component.items()).toEqual([payment]);
    expect(component.reviewCount()).toBeNull();
    expect(component.error()).toBe('');
  });

  it('shows a retryable error instead of a misleading empty list', async () => {
    const { api, component, harness } = await setup();
    api.adminList.mockReturnValueOnce(throwError(() => ({ status: 0 })));
    component.load();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('.empty')).toBeNull();
    component.load();
    expect(component.error()).toBe('');
    expect(component.items()).toEqual([payment]);
  });

  it('shows an empty review queue only after a successful response', async () => {
    const { api, component, harness, router } = await setup();
    api.review.mockReturnValueOnce(of(pageOf([])));
    await router.navigateByUrl('/admin/payments?tab=review');
    harness.detectChanges();
    expect(component.reviewCount()).toBe(0);
    expect(harness.routeNativeElement!.textContent).toContain('Không có giao dịch cần kiểm tra');
  });
});

describe('Admin navigation', () => {
  it('keeps payments in the menu and removes personal profile and legacy subscription orders', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: BreakpointObserver, useValue: { observe: () => of({ breakpoints: {} }) } },
      ],
    });
    const layout = TestBed.runInInjectionContext(() => new AdminLayout());
    expect(layout.menu).toContainEqual(
      expect.objectContaining({ label: 'Quản lý thanh toán', route: '/admin/payments' }),
    );
    expect(
      layout.menu.some((item) =>
        ['/admin/profile', '/admin/subscription-orders', '/admin/payment-review'].includes(
          item.route,
        ),
      ),
    ).toBe(false);
  });
});
