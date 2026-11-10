import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RentalRequestDetailDialogComponent } from './rental-request-detail-dialog.component';
import { RentalService } from '@services/rental/rental.service';

describe('rental request detail dialog', () => {
  const request = vi.fn();
  beforeEach(() => {
    request.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: MAT_DIALOG_DATA,
          useValue: { requestId: 'request-a', agreementPath: '/hop-dong' },
        },
        { provide: RentalService, useValue: { request } },
      ],
    });
  });
  it('loads the selected private request and renders room, fees, dates, identity and message', () => {
    request.mockReturnValue(
      of({
        id: 'request-a',
        propertyName: 'Nhà trọ A',
        roomNumber: 'A101',
        status: 'PENDING',
        tenantName: 'Nguyễn A',
        tenantPhone: '0912345678',
        maskedCitizenId: '********8901',
        proposedMoveInDate: '2027-01-01',
        endDate: '2027-12-31',
        durationMonths: 12,
        occupantCount: 2,
        message: 'Tôi muốn thuê phòng',
        roomDetails: {
          fullAddress: '123 Đường A, Hà Nội',
          price: 3000000,
          deposit: 0,
          electricityPrice: null,
          waterPrice: 20000,
          serviceFee: 100000,
          priceSource: 'CURRENT_ROOM',
          latitude: null,
          longitude: null,
          roomTypeName: 'Studio',
          areaM2: 25,
          maxOccupants: 2,
        },
      }),
    );
    const f = TestBed.createComponent(RentalRequestDetailDialogComponent);
    f.detectChanges();
    expect(request).toHaveBeenCalledWith('request-a');
    const text = f.nativeElement.textContent;
    for (const value of [
      'Nhà trọ A',
      'A101',
      '123 Đường A, Hà Nội',
      '3.000.000',
      'Miễn phí',
      'Chưa khai báo',
      '********8901',
      'Tôi muốn thuê phòng',
      '01/01/2027',
    ])
      expect(text).toContain(value);
    expect(f.nativeElement.querySelector('app-property-location')).not.toBeNull();
  });
  it('shows a retryable failure inside the modal and supports legacy requests without room data', () => {
    request
      .mockReturnValueOnce(throwError(() => ({ status: 404 })))
      .mockReturnValueOnce(of({ id: 'request-a', status: 'EXPIRED', propertyName: 'Nhà cũ' }));
    const f = TestBed.createComponent(RentalRequestDetailDialogComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'không có quyền xem',
    );
    f.componentInstance.load();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Yêu cầu cũ chưa có thông tin vị trí phòng');
    expect(f.componentInstance.error()).toBe('');
  });
  it('cancels a pending read when the modal closes', () => {
    const pending = new Subject();
    request.mockReturnValue(pending);
    const f = TestBed.createComponent(RentalRequestDetailDialogComponent);
    expect(f.componentInstance.loading()).toBe(true);
    expect(pending.observed).toBe(true);
    f.destroy();
    expect(pending.observed).toBe(false);
  });
});
