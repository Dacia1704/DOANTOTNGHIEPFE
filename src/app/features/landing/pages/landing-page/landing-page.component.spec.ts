import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LandingPageComponent } from './landing-page.component';
import { PublicListingService } from '@services/public-listing.service';
import { PublicListing, PublicListingList } from '@model/public-listing/public-listing.model';

describe('Landing published posts', () => {
  function setup() {
    const api = {
      search: vi.fn(() => of({ items: [], page: 0, total: 0, totalPages: 0 } as PublicListingList)),
      getById: vi.fn(),
    };
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: PublicListingService, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
    const component = TestBed.createComponent(LandingPageComponent).componentInstance;
    return { component, api, router };
  }
  it('starts with published API results and never falls back to raw rooms or mock cards', () => {
    const { component, api } = setup();
    component.ngOnInit();
    expect(api.search).toHaveBeenCalled();
    expect(component.rooms()?.items).toEqual([]);
    api.search.mockReturnValueOnce(throwError(() => ({ status: 503 })));
    component.updateFilters({ maxPrice: 100 });
    expect(component.rooms()).toBeNull();
    expect(component.searchError()).not.toBe('');
  });
  it('does not let an old filter request replace newer published results', () => {
    const { component, api } = setup();
    const slow = new Subject<PublicListingList>();
    api.search.mockReturnValueOnce(slow);
    component.ngOnInit();
    component.updateFilters({ minPrice: 3000000 });
    slow.next({
      items: [{ listingId: 'stale' } as PublicListing],
      page: 0,
      total: 1,
      totalPages: 1,
    });
    expect(component.rooms()?.items).toEqual([]);
  });
  it('opens the public detail route where listing visibility is rechecked', () => {
    const { component, router } = setup();
    component.openRoom({ listingId: 'post-1' } as PublicListing);
    expect(router.navigate).toHaveBeenCalledWith(['/tro', 'post-1']);
  });
});
