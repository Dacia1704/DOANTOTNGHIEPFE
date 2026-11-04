import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { SubscriptionService } from '@services/subscription/subscription.service';
import { ServicePackagePageComponent } from '../service-package/pages/service-package-page/service-package-page.component';
import { BoostPageComponent } from '../boost/pages/boost-page/boost-page.component';

registerLocaleData(localeVi);
const rights = {
  packageCode: 'PAID',
  packageName: 'Gói chuyên nghiệp',
  maxListings: 10,
  highPrioritySlots: 2,
  lowPrioritySlots: 3,
  defaultPriorityLevel: 0,
  hasStats: true,
};
const order = {
  id: 'order',
  rights,
  type: 'PURCHASE',
  status: 'PENDING_PAYMENT',
  durationMonths: 3,
  price: 100000,
  expiresAt: '2080-01-01T00:00:00+07:00',
  createdAt: '2026-11-01T00:00:00+07:00',
};

describe('package history tables', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: {} },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function flushPage(path: string, page: number, size: number, data: unknown[], total = 32) {
    const request = http.expectOne((request) => request.url.endsWith(path));
    expect(request.request.params.get('page')).toBe(String(page));
    expect(request.request.params.get('size')).toBe(String(size));
    request.flush({
      data: { data, currentPage: page, totalPages: Math.ceil(total / size), totalElements: total },
    });
  }
  function changeSize(element: HTMLElement, value: string) {
    const select = element.querySelector<HTMLSelectElement>('.page-size select')!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }
  function button(element: HTMLElement, text: string) {
    return [...element.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === text,
    )!;
  }

  it('paginates all service histories and preserves order details and checkout', () => {
    const fixture = TestBed.createComponent(ServicePackagePageComponent);
    http
      .expectOne((request) => request.url.endsWith('/subscriptions/current'))
      .flush({ data: { free: false, canSubmitListings: true, rights, scheduledChange: null } });
    flushPage('/service-packages', 0, 10, [], 0);
    // The full order scan still supplies purchase locks independently of the visible history page.
    flushPage('/subscriptions/orders', 0, 10, [], 0);
    flushPage('/subscriptions/orders', 0, 10, [order]);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('tbody')?.textContent).toContain('Gói chuyên nghiệp');
    expect(element.querySelector('tbody a')?.getAttribute('href')).toBe(
      '/thanh-toan/xac-nhan/SERVICE_PACKAGE/order',
    );
    button(element, 'Chi tiết').click();
    fixture.detectChanges();
    expect(element.querySelector('tbody')?.textContent).toContain('Mã đơn: order');
    button(element, 'Trang sau').click();
    flushPage('/subscriptions/orders', 1, 10, [order]);
    fixture.detectChanges();
    changeSize(element, '20');
    flushPage('/subscriptions/orders', 0, 20, [order]);
    fixture.detectChanges();
    button(element, 'Lịch sử gói').click();
    flushPage('/subscriptions/history', 0, 20, [
      {
        id: 'subscription',
        status: 'ACTIVE',
        startAt: '2030-01-01T00:00:00+07:00',
        endAt: '2031-01-01T00:00:00+07:00',
      },
    ]);
    fixture.detectChanges();
    expect(element.querySelector('tbody')?.textContent).toContain('subscription');
    button(element, 'Các kỳ sử dụng').click();
    flushPage('/subscriptions/periods', 0, 20, [
      { id: 'period', periodNumber: 2, rights, startAt: null, endAt: null },
    ]);
    fixture.detectChanges();
    expect(element.querySelector('tbody')?.textContent).toContain('Gói chuyên nghiệp');
    expect(element.querySelector('.table-toolbar')).not.toBeNull();
  });

  it('shows Boost purchases in a table with working page sizes and payment links', () => {
    const fixture = TestBed.createComponent(BoostPageComponent);
    http
      .expectOne((request) => request.url.endsWith('/boost-subscriptions/active'))
      .flush({ data: [] });
    flushPage('/listings/mine', 0, 10, [], 0);
    fixture.componentInstance.switchTab('history');
    const boost = {
      id: 'boost',
      packageNameSnapshot: 'Boost tháng',
      highPrioritySlotsSnapshot: 2,
      lowPrioritySlotsSnapshot: 3,
      durationMonthsSnapshot: 1,
      price: 150000,
      status: 'PENDING_PAYMENT',
      paymentExpiresAt: '2080-01-01T00:00:00+07:00',
      startAt: null,
      endAt: null,
    };
    flushPage('/boost-subscriptions', 0, 10, [boost]);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('tbody')?.textContent).toContain('Boost tháng');
    expect(element.querySelector('tbody a')?.getAttribute('href')).toBe(
      '/thanh-toan/xac-nhan/BOOST_PACKAGE/boost',
    );
    changeSize(element, '5');
    flushPage('/boost-subscriptions', 0, 5, [boost]);
    fixture.detectChanges();
    button(element, 'Trang sau').click();
    flushPage('/boost-subscriptions', 1, 5, [boost]);
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(1);
  });

  it('retains default history sizes for other callers', () => {
    TestBed.inject(SubscriptionService).history().subscribe();
    flushPage('/subscriptions/history', 0, 10, [], 0);
  });
});
