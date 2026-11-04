import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '@model/api-response';
import { ListingReviews, ReviewTarget } from '@model/review/listing-review.model';

@Injectable({ providedIn: 'root' })
export class ListingReviewService {
  private readonly http = inject(HttpClient);

  get(listingId: string, target: ReviewTarget, roomId: string | null, page = 0) {
    let params = new HttpParams().set('target', target).set('page', page).set('size', 4);
    if (target === 'ROOM' && roomId) params = params.set('roomId', roomId);
    return this.http
      .get<ApiResponse<ListingReviews>>(
        `${environment.apiUrl}/listings/${encodeURIComponent(listingId)}/reviews`,
        { params },
      )
      .pipe(map((response) => response.data));
  }
}
