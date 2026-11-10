import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RentalListPageComponent } from './rental-list-page.component';
import { RentalService } from '@services/rental/rental.service';
import { PropertyService } from '@services/property/property.service';
import { AuthService } from '@services/auth/auth.service';
import { RentalAgreement, RentalRequest } from '@model/rental/rental.model';

describe('tenant rental feed', () => {
  const api = { requests: vi.fn(), agreements: vi.fn(), summary: vi.fn() };
  const open = vi.fn();
  beforeEach(() => {
    const page = { data: [], currentPage: 0, totalPages: 3, totalElements: 25 };
    api.requests.mockReset().mockReturnValue(of(page));
    api.agreements.mockReset().mockReturnValue(of(page));
    api.summary
      .mockReset()
      .mockReturnValue(
        of({
          totalRequests: 25,
          statuses: { PENDING: 12, ACCEPTED: 6, REJECTED: 4, EXPIRED: 3 },
          totalAgreements: 6,
        }),
      );
    open.mockReset().mockReturnValue({ afterClosed: () => of(undefined) });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: RentalService, useValue: api },
        { provide: PropertyService, useValue: {} },
        { provide: AuthService, useValue: { session: () => ({ fullName: 'Nguyễn An' }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        { provide: MatDialog, useValue: { open } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
  });
  it('places contracts after expired and requests the selected status from page zero', () => {
    const f = TestBed.createComponent(RentalListPageComponent);
    f.detectChanges();
    expect(
      Array.from(f.nativeElement.querySelectorAll('.status-tabs button')).map((b: any) =>
        Array.from(b.querySelectorAll('span:not(.material-symbols-outlined), b'))
          .map((node: any) => node.textContent.trim())
          .join(' '),
      ),
    ).toEqual([
      'Tất cả 25',
      'Đang chờ phản hồi 12',
      'Đã chấp nhận 6',
      'Đã từ chối 4',
      'Đã hết hạn 3',
      'Hợp đồng 6',
    ]);
    const c = f.componentInstance;
    c.page = 2;
    c.selectTenantTab('EXPIRED');
    expect(api.requests).toHaveBeenLastCalledWith(
      false,
      0,
      { status: 'EXPIRED', q: '', sort: 'newest' },
      10,
    );
    expect(c.summary()?.totalRequests).toBe(25);
    c.keyword = 'Phòng A';
    c.order = 'oldest';
    c.selectTenantTab('agreements');
    expect(api.agreements).toHaveBeenLastCalledWith(false, 0, 10, { q: 'Phòng A', sort: 'oldest' });
  });
  it('renders contracts with the same card layout and participant names without exposing the long code', () => {
    const f = TestBed.createComponent(RentalListPageComponent);
    f.detectChanges();
    api.agreements.mockReturnValue(
      of({
        data: [
          {
            id: 'a',
            agreementCode: 'HD-secret-long-uuid',
            propertyName: 'Nhà trọ An Nhiên',
            roomNumber: 'A101',
            landlordName: 'Chủ trọ A',
            tenantName: 'Nguyễn An',
            price: 3500000,
            deposit: 0,
            status: 'ACTIVE',
            startDate: '2027-01-01',
            endDate: '2027-12-31',
            card: { fullAddress: '123 Đường A', roomTypeName: 'Studio' },
          } as RentalAgreement,
        ],
        currentPage: 0,
        totalPages: 1,
        totalElements: 1,
      }),
    );
    f.componentInstance.selectTenantTab('agreements');
    f.detectChanges();
    expect(f.nativeElement.querySelector('.rental-feed-card')).not.toBeNull();
    expect(f.nativeElement.textContent).toContain('Hợp đồng giữa Chủ trọ A và Nguyễn An');
    expect(f.nativeElement.textContent).toContain('123 Đường A');
    expect(f.nativeElement.textContent).not.toContain('HD-secret-long-uuid');
  });
  it('clears old results after a filtered request fails and keeps detail opening in a modal', () => {
    const c = TestBed.createComponent(RentalListPageComponent).componentInstance;
    c.ngOnInit();
    c.requests.set([{ id: 'stale' } as RentalRequest]);
    api.requests.mockReturnValueOnce(throwError(() => ({ status: 503 })));
    c.selectTenantTab('PENDING');
    expect(c.requests()).toEqual([]);
    expect(c.error()).not.toBe('');
    c.view('request-a');
    expect(open.mock.calls[0][1].data).toEqual({
      requestId: 'request-a',
      agreementPath: '/hop-dong',
    });
  });
});
