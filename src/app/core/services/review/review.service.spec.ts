import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewService } from './review.service';
const review = {
  id: 'r',
  type: 'ROOM',
  rating: 4,
  comment: null,
  landlordReply: null,
  authorName: 'An',
  authorAvatarUrl: null,
  createdAt: '2026-11-01T10:00:00',
  updatedAt: '2026-11-01T10:00:00',
  verifiedStay: true,
};
describe('Review API contract', () => {
  let api: ReviewService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ReviewService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uses server eligibility and sends only the agreement, integer rating and comment', () => {
    api.eligibility('a').subscribe((r) => {
      expect(r.ROOM.canCreate).toBe(false);
      expect(r.LANDLORD.canCreate).toBe(true);
    });
    http.expectOne('/api/rental-agreements/a/review-eligibility').flush({
      data: {
        room: { canCreate: false, reviewId: 'r', reason: 'ROOM_REVIEW_EXISTED' },
        landlord: { canCreate: true, reviewId: null, reason: null },
        tenant: { canCreate: false, reviewId: null, reason: 'NOT_REVIEW_AUTHOR' },
      },
    });
    api
      .create('ROOM', { rentalAgreementId: 'a', rating: 4, comment: '' })
      .subscribe((r) => expect(r.createdAt).toBeInstanceOf(Date));
    const req = http.expectOne('/api/reviews/rooms');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ rentalAgreementId: 'a', rating: 4, comment: '' });
    req.flush({ data: review });
  });
  it('distinguishes received review context from private moderation data', () => {
    api.list('received', 'ROOM', 1).subscribe((r) => {
      expect(r.data[0].agreementId).toBe('a');
      expect(r.data[0].canReply).toBe(true);
      expect(r.data[0].hiddenBy).toBeNull();
    });
    const req = http.expectOne((r) => r.url === '/api/landlord/reviews');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({
      data: {
        currentPage: 1,
        totalPages: 2,
        totalElements: 11,
        pageSize: 10,
        data: [
          {
            review,
            rentalAgreementId: 'a',
            agreementCode: 'HD-A',
            targetId: 'room',
            targetName: 'A101',
            propertyName: 'An Nhiên',
            canReply: true,
          },
        ],
      },
    });
  });
  it('omits optional visibility filters for all reviews and uses uppercase type for moderation', () => {
    api.list('admin', 'LANDLORD').subscribe();
    const list = http.expectOne((r) => r.url === '/api/admin/reviews');
    expect(list.request.params.has('hidden')).toBe(false);
    list.flush({ data: { data: [] } });
    api
      .visibility('ROOM', 'r', { hidden: true, reason: 'Nội dung không phù hợp' })
      .subscribe((r) => expect(r.hidden).toBe(true));
    const req = http.expectOne('/api/admin/reviews/ROOM/r/visibility');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.hidden).toBe(true);
    req.flush({
      data: {
        review,
        rentalAgreementId: 'a',
        hidden: true,
        hiddenReason: 'Nội dung không phù hợp',
      },
    });
  });
});
