import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ListingReviewService } from './listing-review.service';

describe('Listing review API', () => {
  it('scopes room reviews to the selection and keeps landlord reviews independent of the room', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(ListingReviewService);
    const http = TestBed.inject(HttpTestingController);
    service.get('post', 'ROOM', 'room-2', 1).subscribe();
    const room = http.expectOne((req) => req.url === '/api/listings/post/reviews');
    expect(room.request.params.get('target')).toBe('ROOM');
    expect(room.request.params.get('roomId')).toBe('room-2');
    expect(room.request.params.get('page')).toBe('1');
    room.flush({ data: {} });
    service.get('post', 'LANDLORD', 'room-2').subscribe();
    const owner = http.expectOne((req) => req.url === '/api/listings/post/reviews');
    expect(owner.request.params.get('target')).toBe('LANDLORD');
    expect(owner.request.params.has('roomId')).toBe(false);
    owner.flush({ data: {} });
    http.verify();
  });
});
