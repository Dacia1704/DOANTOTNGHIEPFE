import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AgreementPageComponent } from './agreement-page.component';
import { RentalService } from '@services/rental/rental.service';
import { AuthService } from '@services/auth/auth.service';
import { RentalAgreement } from '@model/rental/rental.model';
import { ReviewService } from '@services/review/review.service';

describe('agreement confirmation UI', () => {
  const api = { agreement: vi.fn(), pdf: vi.fn(), agreementAction: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      imports: [AgreementPageComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            primaryRole: () => 'TENANT',
            hasAnyRole: (roles: string[]) => roles.includes('TENANT'),
          },
        },
        {
          provide: ReviewService,
          useValue: {
            eligibility: () =>
              of({
                ROOM: { canCreate: false },
                LANDLORD: { canCreate: false },
                TENANT: { canCreate: false },
              }),
          },
        },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'a' })) } },
        { provide: RentalService, useValue: api },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    });
  });
  const contract = (state: string) =>
    ({
      id: 'a',
      agreementCode: 'HD-A',
      status: 'PENDING_CONFIRMATION',
      pdfStatus: state,
      canConfirm: false,
      canDecline: true,
      price: 1,
      deposit: 0,
      electricityPrice: null,
      waterPrice: null,
      serviceFee: null,
    }) as RentalAgreement;
  it('keeps confirmation unavailable while PDF is being generated', () => {
    api.agreement.mockReturnValue(of(contract('PROCESSING')));
    const f = TestBed.createComponent(AgreementPageComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Đang tạo hợp đồng PDF');
    expect(f.componentInstance.canConfirm).toBe(false);
    expect(api.pdf).not.toHaveBeenCalled();
    f.destroy();
  });
  it('shows failed PDF as retryable without claiming booking failed', () => {
    api.agreement.mockReturnValue(of(contract('FAILED')));
    const f = TestBed.createComponent(AgreementPageComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Chưa thể tạo hợp đồng');
    expect(api.pdf).not.toHaveBeenCalled();
    expect(f.componentInstance.canConfirm).toBe(false);
    f.destroy();
  });
  it('requires a verified displayed PDF even when server permits confirmation', () => {
    const f = TestBed.createComponent(AgreementPageComponent);
    f.componentInstance.agreement.set({ ...contract('READY'), canConfirm: true });
    f.componentInstance.accepted = true;
    expect(f.componentInstance.canConfirm).toBe(false);
    f.componentInstance.action('confirm');
    expect(api.agreementAction).not.toHaveBeenCalled();
    f.destroy();
  });
});
