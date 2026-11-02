import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BookingDialogComponent } from '../../../features/tenant/listing/components/booking-dialog/booking-dialog.component';
import { AuthService } from '@services/auth/auth.service';
import { RentalService } from '@services/rental/rental.service';
import { rentalEndDate } from '@model/rental/rental.model';

describe('rental booking form', () => {
  const close = vi.fn();
  const create = vi.fn();
  const room = {
    id: 'room',
    displayName: 'A101',
    maxOccupants: 2,
    price: 3000000,
    defaultDeposit: 1000000,
    electricityPrice: 3500,
    waterPrice: null,
    serviceFee: 0,
    bookingAvailability: 'AVAILABLE',
  };
  beforeEach(() => {
    close.mockReset();
    create.mockReset();
    TestBed.configureTestingModule({
      imports: [BookingDialogComponent],
      providers: [
        provideRouter([]),
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            listing: { id: 'post', propertyName: 'Nhà trọ', fullAddress: 'Hà Nội' },
            room,
          },
        },
        { provide: MatDialogRef, useValue: { close, disableClose: false } },
        {
          provide: AuthService,
          useValue: {
            session: () => ({ fullName: 'Nguyễn A', email: 'a@example.test', phone: '0912345678' }),
          },
        },
        { provide: RentalService, useValue: { create } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
  });
  function component() {
    const f = TestBed.createComponent(BookingDialogComponent);
    f.detectChanges();
    return f;
  }
  function fill(c: BookingDialogComponent) {
    c.form.patchValue({
      tenantCitizenId: '012345678901',
      tenantPermanentAddress: 'Hà Nội, Việt Nam',
      proposedMoveInDate: '2090-01-31',
      durationMonths: 1,
      occupantCount: 2,
      acceptedPrivacyNotice: true,
    });
  }
  it('requires identity, privacy consent, and a valid occupant count', () => {
    const f = component();
    f.componentInstance.submit();
    expect(create).not.toHaveBeenCalled();
    fill(f.componentInstance);
    expect(f.componentInstance.form.valid).toBe(true);
    f.componentInstance.form.controls.occupantCount.setValue(3);
    expect(f.componentInstance.form.invalid).toBe(true);
    expect(f.nativeElement.querySelector('[formcontrolname="quantity"]')).toBeNull();
  });
  it('does not double-submit while HTTP is pending and sends one fixed room', () => {
    const f = component();
    fill(f.componentInstance);
    create.mockReturnValue(new Subject());
    f.componentInstance.submit();
    f.componentInstance.submit();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].roomId).toBe('room');
    expect(create.mock.calls[0][0].listingId).toBe('post');
    expect(create.mock.calls[0][0].price).toBeUndefined();
    expect(f.componentInstance.busy()).toBe(true);
  });
  it('shows availability conflict and asks parent to refresh on close', () => {
    const f = component();
    fill(f.componentInstance);
    create.mockReturnValue(
      throwError(() => ({ status: 409, error: { errorCode: 'ROOM_UNAVAILABLE' } })),
    );
    f.componentInstance.submit();
    f.detectChanges();
    expect(f.componentInstance.unavailable()).toBe(true);
    expect(f.nativeElement.textContent).toContain('Phòng vừa được người khác giữ/thuê');
    expect(f.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });
  it('returns to login with the listing redirect after authentication expires', () => {
    const f = component();
    fill(f.componentInstance);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    create.mockReturnValue(throwError(() => ({ status: 401 })));
    f.componentInstance.submit();
    expect(close).toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith(['/login'], { queryParams: { redirect: '/tro/post' } });
  });
  it('matches server month-end dates', () => {
    expect(rentalEndDate('2027-01-31', 1)).toBe('2027-02-27');
    expect(rentalEndDate('2028-01-31', 1)).toBe('2028-02-28');
    expect(rentalEndDate('2027-01-31', 1.5)).toBe('');
    expect(rentalEndDate('', 12)).toBe('');
  });
});

describe('rental HTTP API', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('uses paginated private endpoints and passes room and property filters', () => {
    TestBed.inject(RentalService)
      .requests(true, 2, { status: 'PENDING', roomId: 'r', propertyId: 'p' })
      .subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne((r) =>
      r.url.endsWith('/landlord/rental-requests'),
    );
    expect(request.request.params.get('roomId')).toBe('r');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ data: { data: [] } });
  });
  it('confirms the exact displayed PDF hash and downloads bytes through HttpClient', () => {
    const api = TestBed.inject(RentalService);
    const http = TestBed.inject(HttpTestingController);
    api.agreementAction('contract', 'confirm', 'a'.repeat(64)).subscribe();
    const confirm = http.expectOne((r) => r.url.endsWith('/rental-agreements/contract/confirm'));
    expect(confirm.request.body).toEqual({ accepted: true, expectedPdfSha256: 'a'.repeat(64) });
    confirm.flush({ data: {} });
    api.pdf('contract').subscribe();
    const pdf = http.expectOne((r) => r.url.endsWith('/rental-agreements/contract/pdf'));
    expect(pdf.request.responseType).toBe('blob');
    pdf.flush(new Blob(['%PDF-test'], { type: 'application/pdf' }));
  });
});
