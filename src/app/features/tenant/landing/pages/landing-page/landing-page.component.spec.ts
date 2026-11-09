import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LandingPageComponent } from './landing-page.component';
import { PublicListingService } from '@services/listing/public-listing.service';
import {
  PublicListing,
  PublicListingList,
  ListingPriceStatistics,
} from '@model/public-listing/public-listing.model';
import { AddressService } from '@services/address/address.service';
import { Province } from '@model/address/province.model';
import { Ward } from '@model/address/ward.model';
import { GeolocationService } from '@services/maps/geolocation.service';

describe('Landing published posts', () => {
  function setup(shallow = false) {
    const api = {
      search: vi.fn(() => of({ items: [], page: 0, total: 0, totalPages: 0 } as PublicListingList)),
      getById: vi.fn(),
      searchMap: vi.fn(() => of([] as PublicListing[])),
      priceStatistics: vi.fn(() => of([] as ListingPriceStatistics[])),
    };
    const addresses = {
      getProvinces: vi.fn(() => of([] as Province[])),
      getAllWards: vi.fn(() => of([] as Ward[])),
    };
    const geolocation = { locate: vi.fn(async () => ({ latitude: 10, longitude: 106 })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: PublicListingService, useValue: api },
        { provide: GeolocationService, useValue: geolocation },
        { provide: AddressService, useValue: addresses },
        provideRouter([]),
      ],
    });
    if (shallow)
      TestBed.overrideComponent(LandingPageComponent, { set: { template: '', imports: [] } });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LandingPageComponent);
    const component = fixture.componentInstance;
    return { component, api, router, fixture, geolocation, addresses };
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
  it('keeps price statistics independent from list pagination and pins only located listings', () => {
    const { component } = setup();
    component.rooms.set({
      items: [
        {
          listingId: 'a',
          listingTitle: 'A',
          price: 2000000,
          property: { wardName: 'Khu A', latitude: 10, longitude: 106 },
        },
        { listingId: 'b', price: 4000000, property: { wardName: 'Khu A' } },
        { listingId: 'c', price: 0, property: { wardName: 'Khu B' } },
      ] as PublicListing[],
      page: 0,
      total: 3,
      totalPages: 1,
    });
    expect(component.lowestPrice()).toBe(2000000);
    component.statistics.set([
      { areaId: 'a', areaName: 'Khu A', averagePrice: 3000000, roomCount: 2 },
    ]);
    expect(component.priceInsights()).toEqual([
      expect.objectContaining({ name: 'Khu A', average: 3000000, count: 2, width: 100 }),
    ]);
    expect(component.mapPins().map((pin) => pin.id)).toEqual(['a']);
    component.openPin('a');
    component.rooms.set({ items: [], page: 0, total: 0, totalPages: 0 });
    expect(component.lowestPrice()).toBeNull();
    expect(component.priceInsights()[0].average).toBe(3000000);
    component.statistics.set([]);
    expect(component.priceInsights()).toEqual([]);
    expect(component.mapPins()).toEqual([]);
  });
  it('resets the ward when changing province and ignores older ward and statistics responses', () => {
    const { component, api, addresses } = setup();
    component.ngOnInit();
    const oldWards = new Subject<Ward[]>();
    const oldStatistics = new Subject<ListingPriceStatistics[]>();
    addresses.getAllWards.mockReturnValueOnce(oldWards);
    api.priceStatistics.mockReturnValueOnce(oldStatistics);
    component.changeStatisticsProvince('province-a');
    component.changeStatisticsWard('ward-a');
    component.changeStatisticsProvince('province-b');
    expect(component.statisticsWard()).toBe('');
    expect(api.priceStatistics).toHaveBeenLastCalledWith('province-b', '');
    oldWards.next([{ id: 'ward-a' } as Ward]);
    oldStatistics.next([{ areaId: 'ward-a', areaName: 'Old', averagePrice: 1, roomCount: 1 }]);
    expect(component.statisticsWards()).toEqual([]);
    expect(component.statistics()).toEqual([]);
  });
  it('searches around the selected campus without retaining incompatible location filters', () => {
    const { component, api } = setup();
    vi.spyOn(component, 'scrollTo').mockImplementation(() => {});
    component.ngOnInit();
    component.updateFilters({
      provinceId: 'old',
      wardId: 'old-ward',
      minPrice: 1000000,
      south: 1,
      north: 2,
      west: 3,
      east: 4,
    });
    component.selectPlace({
      name: 'Trường đã chọn',
      address: 'Địa chỉ trường',
      latitude: 10,
      longitude: 106,
    });
    expect(api.search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        latitude: 10,
        longitude: 106,
        radiusKm: 3,
        minPrice: 1000000,
        provinceId: undefined,
        wardId: undefined,
        south: undefined,
        page: 0,
      }),
    );
    expect(component.filterChips().some((chip) => chip.label.includes('Trường đã chọn'))).toBe(
      true,
    );
    component.removeFilter('map');
    expect(component.nearbyPlace()).toBe('');
    expect(component.activeQuery().latitude).toBeUndefined();
  });
  it('keeps ordinary filters and sends only the selected geographic mode, resetting its page', () => {
    const { component, api } = setup();
    component.ngOnInit();
    component.updateFilters({ minPrice: 100, provinceId: 'p', amenityNames: ['WiFi'] });
    component.applyLocationFilter({ kind: 'radius', latitude: 0, longitude: 0, radiusKm: 3 });
    expect(api.search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        latitude: 0,
        longitude: 0,
        radiusKm: 3,
        minPrice: 100,
        provinceId: 'p',
        page: 0,
      }),
    );
    component.applyLocationFilter({ kind: 'bounds', south: 0, north: 1, west: 170, east: -170 });
    expect(component.activeQuery().radiusKm).toBeUndefined();
    expect(component.activeQuery().latitude).toBeUndefined();
    expect(api.search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        south: 0,
        north: 1,
        west: 170,
        east: -170,
        amenityNames: ['WiFi'],
        page: 0,
      }),
    );
    component.loadMapPage(1);
    expect(api.search).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, south: 0 }));
    component.removeFilter('map');
    expect(component.activeQuery().south).toBeUndefined();
    expect(component.activeQuery().minPrice).toBe(100);
  });
  it('clears the old map region when a search selects a different province', () => {
    const { component, api } = setup();
    component.ngOnInit();
    component.applyLocationFilter({ kind: 'radius', latitude: 10, longitude: 106, radiusKm: 3 });
    component.searchRooms({ provinceId: 'new-province', maxPrice: 3000000 });
    expect(api.search).toHaveBeenLastCalledWith(
      expect.objectContaining({
        provinceId: 'new-province',
        maxPrice: 3000000,
        latitude: undefined,
        longitude: undefined,
        radiusKm: undefined,
        page: 0,
      }),
    );
  });
  it('requests location on entry and recenters again when my location is pressed', async () => {
    const { component, fixture, geolocation } = setup(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(geolocation.locate).toHaveBeenCalledOnce();
    expect(component.mapCenter()).toEqual({ latitude: 10, longitude: 106 });
    const revision = component.locationRevision();
    await component.locate();
    expect(component.locationRevision()).toBe(revision + 1);
    fixture.destroy();
  });
  it('keeps listing pins available after denial and supports retrying location', async () => {
    const { component, geolocation } = setup();
    geolocation.locate.mockRejectedValueOnce(new Error('Định vị bị từ chối'));
    await component.locate();
    expect(component.locationError()).toContain('từ chối');
    expect(component.locating()).toBe(false);
    await component.locate();
    expect(component.locationError()).toBe('');
    expect(component.userPosition()).toEqual({ latitude: 10, longitude: 106 });
  });
  it('loads map pins independently from the paginated results and opens an off-page listing', () => {
    const { component, api, router } = setup();
    const items = Array.from(
      { length: 25 },
      (_, index) =>
        ({
          id: `post-${index}`,
          listingId: `post-${index}`,
          price: 100,
          property: { latitude: 10 + index / 100, longitude: 106 },
        }) as PublicListing,
    );
    api.searchMap.mockReturnValueOnce(of(items));
    component.ngOnInit();
    expect(component.rooms()?.items).toHaveLength(0);
    expect(component.mapPins()).toHaveLength(25);
    component.openPin('post-24');
    expect(router.navigate).toHaveBeenCalledWith(['/tro', 'post-24']);
  });
  it('does not override a selected school with an older location response', async () => {
    const { component, geolocation } = setup();
    let resolve!: (point: { latitude: number; longitude: number }) => void;
    geolocation.locate.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const pending = component.locate();
    vi.spyOn(component, 'scrollTo').mockImplementation(() => {});
    component.selectPlace({ name: 'Trường', address: 'Địa chỉ', latitude: 20, longitude: 105 });
    resolve({ latitude: 10, longitude: 106 });
    await pending;
    expect(component.userPosition()).toBeNull();
    expect(component.activeQuery().latitude).toBe(20);
  });
});
