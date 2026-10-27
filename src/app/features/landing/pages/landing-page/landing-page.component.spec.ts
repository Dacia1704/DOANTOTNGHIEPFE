import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
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
    const dialog = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: PublicListingService, useValue: api },
        { provide: MatDialog, useValue: dialog },
      ],
    });
    const component = TestBed.createComponent(LandingPageComponent).componentInstance;
    return { component, api, dialog };
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
  it('rechecks a listing before opening details and keeps hidden or expired posts closed', () => {
    const { component, api, dialog } = setup();
    api.getById.mockReturnValue(throwError(() => ({ status: 404 })));
    component.openRoom({ listingId: 'hidden' } as PublicListing);
    expect(api.getById).toHaveBeenCalledWith('hidden');
    expect(dialog.open).not.toHaveBeenCalled();
    expect(component.searchError()).toContain('không còn hiệu lực');
  });
});
