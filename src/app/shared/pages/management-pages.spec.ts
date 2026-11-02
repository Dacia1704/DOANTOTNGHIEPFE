import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ListingPageComponent } from '../../features/landlord/listing/pages/listing-page/listing-page.component';
import { PaymentHistoryPageComponent } from '../../features/landlord/payment/pages/payment-history-page/payment-history-page.component';
import { RentalListPageComponent } from './rental/rental-list-page.component';

registerLocaleData(localeVi);

const listing = {
  id: 'listing',
  title: 'Phòng A101',
  description: 'Nội dung cho thuê',
  status: 'PUBLISHED',
  landlordId: 'owner',
  propertyId: 'property',
  propertyName: 'Cơ sở A',
  expiresAt: '2080-01-01T00:00:00+07:00',
  pendingExpiresAt: '2080-01-01T00:00:00+07:00',
  priorityLevel: 2,
  packagePriorityLevel: 1,
};
const payment = {
  id: 'payment',
  merchantOrderId: 'REF123',
  type: 'SERVICE_PACKAGE',
  amount: 250000,
  status: 'SUCCESS',
  requiresReview: true,
  paidAt: '2026-11-01T10:00:00+07:00',
  expiresAt: null,
};
const rental = {
  id: 'request',
  propertyId: 'property',
  propertyName: 'Cơ sở A',
  roomNumber: '101',
  tenantName: 'Khách A',
  status: 'PENDING',
  proposedMoveInDate: '2030-01-01',
  createdAt: '2026-11-01T10:00:00+07:00',
  durationMonths: 12,
  occupantCount: 2,
};

describe('landlord management tables', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { landlord: true } } } },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function flushPage(path: string, page: number, size: number, records: unknown[], total = 32) {
    const request = http.expectOne((request) => request.url.endsWith(path));
    expect(request.request.params.get('page')).toBe(String(page));
    expect(request.request.params.get('size')).toBe(String(size));
    request.flush({
      data: {
        data: records,
        currentPage: page,
        pageSize: size,
        totalPages: Math.ceil(total / size),
        totalElements: total,
      },
    });
  }
  function size(element: HTMLElement, value: string) {
    const select = element.querySelector<HTMLSelectElement>('.page-size select')!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }
  function button(element: HTMLElement, text: string) {
    return [...element.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === text,
    )!;
  }

  it('keeps listing actions and sends page sizes to the listing API', () => {
    const fixture = TestBed.createComponent(ListingPageComponent);
    flushPage('/listings/mine', 0, 10, [
      listing,
      { ...listing, id: 'hidden', title: 'Tin ẩn', status: 'HIDDEN' },
    ]);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.management-table .table-toolbar form')).not.toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    const page = fixture.componentInstance;
    const action = vi.spyOn(page, 'action').mockImplementation(() => {});
    const allocation = vi.spyOn(page, 'allocation').mockImplementation(() => {});
    const edit = vi.spyOn(page, 'edit').mockImplementation(() => {});
    button(element, 'Ẩn tin').click();
    button(element, 'Phân bổ / thu hồi Boost').click();
    button(element, 'Sửa nội dung').click();
    button(element, 'Gửi duyệt lại').click();
    expect(action).toHaveBeenCalledWith(page.items()[0], 'hide');
    expect(action).toHaveBeenCalledWith(page.items()[1], 'submit');
    expect(allocation).toHaveBeenCalledWith(page.items()[0]);
    expect(edit).toHaveBeenCalledWith(page.items()[1]);
    size(element, '20');
    flushPage('/listings/mine', 0, 20, [listing]);
    fixture.detectChanges();
    button(element, 'Trang sau').click();
    flushPage('/listings/mine', 1, 20, [listing]);
    fixture.detectChanges();
    const search = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'Mẫu';
    search.dispatchEvent(new Event('input'));
    expect(page.items()).toHaveLength(1);
  });

  it('keeps payment detail links, review status and pagination in one panel', () => {
    const fixture = TestBed.createComponent(PaymentHistoryPageComponent);
    flushPage('/payments', 0, 10, [payment]);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('REF123');
    expect(element.textContent).toContain('Đã thanh toán');
    expect(element.querySelectorAll('tbody app-billing-status')).toHaveLength(2);
    expect(element.querySelector('tbody a')?.getAttribute('href')).toBe('/thanh-toan/payment');
    size(element, '5');
    flushPage('/payments', 0, 5, [payment]);
    fixture.detectChanges();
    button(element, 'Trang sau').click();
    flushPage('/payments', 1, 5, [payment]);
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(1);
  });

  it('retries payment failures with the selected page size', () => {
    const fixture = TestBed.createComponent(PaymentHistoryPageComponent);
    http
      .expectOne((request) => request.url.endsWith('/payments'))
      .flush({ message: 'Lỗi tải' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    button(element, 'Thử lại').click();
    flushPage('/payments', 0, 10, [], 0);
    fixture.detectChanges();
    expect(element.textContent).toContain('Chưa có giao dịch');
    expect(element.querySelector('.page-size')).not.toBeNull();
  });

  it('preserves rental filters, request actions and agreement navigation', () => {
    const fixture = TestBed.createComponent(RentalListPageComponent);
    fixture.detectChanges();
    const first = http.expectOne((request) => request.url.endsWith('/landlord/rental-requests'));
    expect(first.request.params.get('status')).toBe('PENDING');
    first.flush({ data: { data: [rental], currentPage: 0, totalPages: 4, totalElements: 32 } });
    flushPage('/properties/mine', 0, 100, [], 0);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const page = fixture.componentInstance;
    expect(
      element.querySelector('.management-table .table-toolbar .management-filters'),
    ).not.toBeNull();
    expect(element.querySelector('tbody')?.textContent).toContain('Khách A');
    const action = vi.spyOn(page, 'action').mockImplementation(() => {});
    button(element, 'Chấp nhận').click();
    button(element, 'Từ chối').click();
    expect(action).toHaveBeenCalledWith(page.requests()[0], 'accept');
    expect(action).toHaveBeenCalledWith(page.requests()[0], 'reject');
    size(element, '20');
    flushPage('/landlord/rental-requests', 0, 20, [rental]);
    fixture.detectChanges();
    button(element, 'Trang sau').click();
    flushPage('/landlord/rental-requests', 1, 20, [rental]);
    fixture.detectChanges();
    button(element, 'Hợp đồng').click();
    flushPage('/landlord/rental-agreements', 0, 20, [
      {
        id: 'agreement',
        agreementCode: 'HD001',
        propertyName: 'Cơ sở A',
        roomNumber: '101',
        tenantName: 'Khách A',
        status: 'ACTIVE',
        startDate: '2030-01-01',
        endDate: '2031-01-01',
      },
    ]);
    fixture.detectChanges();
    expect(element.querySelector('tbody a')?.getAttribute('href')).toBe(
      '/landlord/agreements/agreement',
    );
    button(element, 'Yêu cầu thuê').click();
    flushPage('/landlord/rental-requests', 0, 20, [rental]);
    fixture.detectChanges();
    button(element, 'Xóa bộ lọc').click();
    const cleared = http.expectOne((request) => request.url.endsWith('/landlord/rental-requests'));
    expect(cleared.request.params.has('status')).toBe(false);
    cleared.flush({ data: { data: [], currentPage: 0, totalPages: 0, totalElements: 0 } });
    fixture.detectChanges();
    expect(element.textContent).toContain('Chưa có yêu cầu phù hợp');
  });

  it('keeps tenant rental pages in the existing card view', () => {
    TestBed.inject(ActivatedRoute).snapshot.data['landlord'] = false;
    const fixture = TestBed.createComponent(RentalListPageComponent);
    fixture.detectChanges();
    flushPage('/rental-requests/my', 0, 10, [rental]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-management-table')).toBeNull();
    expect(fixture.nativeElement.querySelector('.cards')).not.toBeNull();
  });
});
