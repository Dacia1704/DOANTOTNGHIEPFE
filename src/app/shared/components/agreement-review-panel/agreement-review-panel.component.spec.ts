import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { RentalAgreement } from '@model/rental/rental.model';
import { AuthService } from '@services/auth/auth.service';
import { ReviewService } from '@services/review/review.service';
import { AgreementReviewPanelComponent } from './agreement-review-panel.component';
describe('Agreement review access', () => {
  const api = { eligibility: vi.fn() };
  const dialog = { open: vi.fn() };
  let role: string;
  beforeEach(() => {
    vi.resetAllMocks();
    role = 'TENANT';
    api.eligibility.mockReturnValue(
      of({
        ROOM: { canCreate: false, reviewId: 'r', reason: 'ROOM_REVIEW_EXISTED' },
        LANDLORD: { canCreate: true, reviewId: null, reason: null },
        TENANT: { canCreate: false, reviewId: null, reason: 'NOT_REVIEW_AUTHOR' },
      }),
    );
    TestBed.configureTestingModule({
      imports: [AgreementReviewPanelComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { hasAnyRole: (roles: string[]) => roles.includes(role) },
        },
        { provide: ReviewService, useValue: api },
        { provide: MatDialog, useValue: dialog },
      ],
    });
  });
  function create() {
    const f = TestBed.createComponent(AgreementReviewPanelComponent);
    f.componentRef.setInput('agreement', {
      id: 'a',
      agreementCode: 'HD-A',
      propertyName: 'An Nhiên',
      status: 'ACTIVE',
    } as RentalAgreement);
    f.detectChanges();
    return f;
  }
  it('does not call tenant/landlord eligibility for an admin', () => {
    role = 'ADMIN';
    const f = create();
    expect(api.eligibility).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent.trim()).toBe('');
  });
  it('keeps the completed room review separate from an eligible landlord review', () => {
    const f = create();
    expect(f.nativeElement.textContent).toContain('Đã đánh giá');
    f.componentInstance.write('ROOM');
    expect(dialog.open).not.toHaveBeenCalled();
    dialog.open.mockReturnValue({ afterClosed: () => of({ changed: true }) });
    f.componentInstance.write('LANDLORD');
    expect(dialog.open.mock.calls[0][1].data).toMatchObject({ type: 'LANDLORD', agreementId: 'a' });
    expect(api.eligibility).toHaveBeenCalledTimes(2);
  });
});
