import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, throwError } from 'rxjs';
import { AiListingItem } from '@model/ai/ai.model';
import { PublicListing, PublicListingList } from '@model/public-listing/public-listing.model';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { AuthService } from '@services/auth/auth.service';
import { PublicListingService } from '@services/listing/public-listing.service';

export interface AiSearchResults {
  id: string;
  question: string;
  items: AiListingItem[];
}

@Injectable({ providedIn: 'root' })
export class AiSearchResultsService {
  private readonly router = inject(Router);
  private readonly listings = inject(PublicListingService);
  private readonly auth = inject(AuthService);
  private readonly state = new BehaviorSubject<AiSearchResults | null>(null);
  readonly results$ = this.state.asObservable();

  constructor() {
    let owner = this.auth.session()?.id;
    effect(() => {
      const current = this.auth.session()?.id;
      if (owner !== current) {
        owner = current;
        this.state.next(null);
      }
    });
  }

  show(items: AiListingItem[], question: string): void {
    if (!items.length) return;
    const unique = [...new Map(items.map(item => [item.listing_id || item.id, item])).values()];
    const selection = { id: crypto.randomUUID(), question, items: unique };
    this.state.next(selection);
    // Query changes update the existing search component without closing the root chat.
    void this.router.navigate(['/tim-phong'], { queryParams: { ai: selection.id } });
  }

  load(selection: AiSearchResults, query: RoomQueryParams): Observable<PublicListingList> {
    return forkJoin(selection.items.map(item =>
      this.listings.getById(item.listing_id || item.id).pipe(
        map((listing): PublicListing => ({
          ...listing,
          aiDifferences: item.differences,
          price: item.price,
          extraLabel: `${item.area_m2} m²`,
          amenities: item.amenities.map(name =>
            [...listing.amenities, ...listing.property.rooms.flatMap(room => room.amenities)]
              .find(amenity => amenity.name === name) || { id: name, name, icon: '' },
          ),
        })),
        catchError(error => [404, 410].includes(error.status)
          ? of(null)
          : throwError(() => error)),
      ),
    )).pipe(map(rows => {
      const items: PublicListing[] = rows.filter((row): row is PublicListing => row !== null);
      if (query.sort === 'price-asc') items.sort((a, b) => a.price - b.price);
      if (query.sort === 'price-desc') items.sort((a, b) => b.price - a.price);
      if (query.sort === 'newest') items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
      const page = query.page ?? 0;
      const size = query.size ?? 12;
      return {
        items: items.slice(page * size, (page + 1) * size),
        total: items.length,
        totalPages: Math.ceil(items.length / size),
        page,
      };
    }));
  }
}
