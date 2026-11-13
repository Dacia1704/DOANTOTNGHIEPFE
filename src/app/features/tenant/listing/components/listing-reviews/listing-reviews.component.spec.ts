import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RentalAgreement } from '@model/rental/rental.model';
import { AuthService } from '@services/auth/auth.service';
import { ListingReviewService } from '@services/listing/listing-review.service';
import { RentalService } from '@services/rental/rental.service';
import { ReviewService } from '@services/review/review.service';
import { ListingReviewsComponent } from './listing-reviews.component';

describe('Writing reviews from a listing', () => {
  const rentals = { agreements: vi.fn() };
  const reviews = { eligibility: vi.fn() };
  const listings = { get: vi.fn() };
  const dialogs = { open: vi.fn() };
  const auth = { session: signal<{ id: string } | null>({ id: 'tenant' }), hasAnyRole: vi.fn() };
  const page = (data: Partial<RentalAgreement>[], currentPage = 0, totalPages = 1) => ({
    data,
    currentPage,
    totalPages,
    pageSize: 50,
    totalElements: data.length,
  });
  const agreement = {
    id: 'a',
    roomId: 'r1',
    landlordId: 'owner',
    agreementCode: 'HD-01',
    propertyName: 'Nhà An',
    roomNumber: '101',
  };
  const permissions = (canCreate = true, reviewId: string | null = null) => ({
    ROOM: { canCreate, reviewId, reason: null },
    LANDLORD: { canCreate, reviewId, reason: null },
  });
  beforeEach(() => {
    vi.resetAllMocks();
    auth.session.set({ id: 'tenant' });
    auth.hasAnyRole.mockReturnValue(true);
    rentals.agreements.mockReturnValue(of(page([agreement])));
    reviews.eligibility.mockReturnValue(of(permissions()));
    listings.get.mockReturnValue(
      of({
        summary: { averageRating: null, totalReviews: 0, distribution: [], replyRate: null },
        reviews: page([]),
      }),
    );
    dialogs.open.mockReturnValue({ afterClosed: () => of({ changed: false }) });
    TestBed.configureTestingModule({
      imports: [ListingReviewsComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: RentalService, useValue: rentals },
        { provide: ReviewService, useValue: reviews },
        { provide: ListingReviewService, useValue: listings },
        { provide: MatDialog, useValue: dialogs },
      ],
    });
  });
  function create() {
    const fixture = TestBed.createComponent(ListingReviewsComponent);
    fixture.componentRef.setInput('listingId', 'listing');
    fixture.componentRef.setInput('roomId', 'r1');
    fixture.componentRef.setInput('propertyRoomIds', ['r1', 'r2']);
    fixture.componentRef.setInput('landlordId', 'owner');
    fixture.detectChanges();
    return fixture;
  }
  it('places the direct action at the bottom and tells guests they need a contract', () => {
    auth.hasAnyRole.mockReturnValue(false);
    const fixture = create();
    fixture.nativeElement.querySelector('.write-review').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[routerLink]')).toBeNull();
    expect(fixture.nativeElement.querySelector('#write-review-notice').textContent).toContain(
      'Bạn cần có hợp đồng thuê để đánh giá',
    );
    expect(rentals.agreements).not.toHaveBeenCalled();
    expect(dialogs.open).not.toHaveBeenCalled();
  });
  it('checks all pages and opens the form for the selected room only', () => {
    rentals.agreements.mockImplementation((_owner, index) =>
      of(
        index === 0
          ? page([{ ...agreement, id: 'unrelated', roomId: 'other' }], 0, 2)
          : page([agreement], 1, 2),
      ),
    );
    const fixture = create();
    fixture.componentInstance.writeReview();
    expect(rentals.agreements).toHaveBeenCalledTimes(2);
    expect(reviews.eligibility).toHaveBeenCalledExactlyOnceWith('a');
    expect(dialogs.open.mock.calls[0][1].data).toMatchObject({
      action: 'create',
      type: 'ROOM',
      agreementId: 'a',
    });
  });
  it('requires a contract for this room even when the user has rented another room', () => {
    rentals.agreements.mockReturnValue(of(page([{ ...agreement, roomId: 'other' }])));
    const c = create().componentInstance;
    c.writeReview();
    expect(c.writeNotice()).toBe('Bạn cần có hợp đồng thuê để đánh giá');
    expect(reviews.eligibility).not.toHaveBeenCalled();
  });
  it('uses contracts from other rooms of this property in the whole-property scope', () => {
    rentals.agreements.mockReturnValue(of(page([{ ...agreement, roomId: 'r2' }])));
    const fixture = create();
    fixture.componentInstance.entireProperty.set(true);
    fixture.detectChanges();
    fixture.componentInstance.writeReview();
    expect(dialogs.open.mock.calls[0][1].data.agreementId).toBe('a');
  });
  it('matches landlord reviews to the landlord rather than an unrelated contract', () => {
    rentals.agreements.mockReturnValue(
      of(
        page([
          { ...agreement, id: 'other-owner', landlordId: 'other' },
          { ...agreement, id: 'same-owner', roomId: 'other-property-room' },
        ]),
      ),
    );
    const fixture = create();
    fixture.componentInstance.target.set('LANDLORD');
    fixture.detectChanges();
    fixture.componentInstance.writeReview();
    expect(reviews.eligibility).toHaveBeenCalledExactlyOnceWith('same-owner');
    expect(dialogs.open.mock.calls[0][1].data).toMatchObject({
      type: 'LANDLORD',
      agreementId: 'same-owner',
    });
  });
  it('blocks ineligible and duplicate reviews, but can use a later eligible contract', () => {
    reviews.eligibility.mockReturnValue(of(permissions(false, 'review')));
    const c = create().componentInstance;
    c.writeReview();
    expect(c.writeNotice()).toContain('đã gửi đánh giá');
    expect(dialogs.open).not.toHaveBeenCalled();
    reviews.eligibility.mockReturnValue(of(permissions(false)));
    c.writeReview();
    expect(c.writeNotice()).toContain('hai bên đã xác nhận');
    rentals.agreements.mockReturnValue(of(page([agreement, { ...agreement, id: 'a2' }])));
    reviews.eligibility.mockImplementation((id) =>
      of(permissions(id === 'a2', id === 'a' ? 'review' : null)),
    );
    c.writeReview();
    expect(dialogs.open.mock.calls[0][1].data.agreementId).toBe('a2');
  });
  it('does not mistake an API failure for the absence of a contract', () => {
    rentals.agreements.mockReturnValue(throwError(() => new Error('offline')));
    const c = create().componentInstance;
    c.writeReview();
    expect(c.writeNotice()).toContain('Chưa kiểm tra được');
    expect(c.checkingContract()).toBe(false);
    expect(dialogs.open).not.toHaveBeenCalled();
  });
  it('prevents duplicate checks and cancels an old check after the selected room changes', () => {
    const pending = new Subject<any>();
    rentals.agreements.mockReturnValue(pending);
    const fixture = create();
    const c = fixture.componentInstance;
    c.writeReview();
    c.writeReview();
    expect(rentals.agreements).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('roomId', 'r2');
    fixture.detectChanges();
    pending.next(page([agreement]));
    pending.complete();
    expect(c.checkingContract()).toBe(false);
    expect(dialogs.open).not.toHaveBeenCalled();
  });
  it('refreshes summaries and reviews after a successful submission', () => {
    dialogs.open.mockReturnValue({ afterClosed: () => of({ changed: true }) });
    const c = create().componentInstance;
    c.writeReview();
    expect(listings.get).toHaveBeenCalledTimes(4);
    expect(listings.get).toHaveBeenLastCalledWith('listing', 'LANDLORD', null, 0);
  });
});
