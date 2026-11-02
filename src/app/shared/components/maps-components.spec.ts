import { TestBed } from '@angular/core/testing';
import { SimpleChange, signal } from '@angular/core';
import { vi } from 'vitest';
import { GoogleMapsService } from '@services/maps/google-maps.service';
import { GeolocationService } from '@services/maps/geolocation.service';
import { MapCanvasComponent } from './map-canvas/map-canvas.component';
import { MapPlaceSearchComponent } from './map-place-search/map-place-search.component';
import { PropertyLocationComponent } from './property-location/property-location.component';
import { LocationPickerComponent } from './location-picker/location-picker.component';
import { ListingMapComponent } from '../../features/tenant/landing/components/listing-map/listing-map.component';
import { Coordinates, LocationFilter, MapsMarker, MapsPlaceResult } from '@model/maps/maps.model';
import { PublicListing } from '@model/public-listing/public-listing.model';

describe('Map rendering and selection', () => {
  async function setup(editable = false) {
    const callbacks: Record<string, (event?: unknown) => void> = {};
    const removed = vi.fn();
    const map = {
      addListener: vi.fn((event: string, callback: (event?: unknown) => void) => {
        callbacks[event] = callback;
        return { remove: removed };
      }),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      getBounds: () => ({ toJSON: () => ({ south: 0, north: 1, west: 170, east: -170 }) }),
    };
    const markers: MapsMarker[] = [];
    const popup = { setContent: vi.fn(), open: vi.fn(), close: vi.fn() };
    const library = {
      Map: vi.fn(function () {
        return map;
      }),
      AdvancedMarkerElement: vi.fn(function (options: Record<string, unknown>) {
        const marker = Object.assign(document.createElement('div'), {
          position: options['position'],
          map: options['map'],
        }) as MapsMarker;
        markers.push(marker);
        return marker;
      }),
      InfoWindow: vi.fn(function () {
        return popup;
      }),
      Circle: vi.fn(function () {
        return { setMap: vi.fn() };
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GoogleMapsService,
          useValue: {
            libraries: vi.fn(async () => library),
            config: { mapId: 'test-map' },
            authError: signal(''),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(MapCanvasComponent);
    fixture.componentRef.setInput('editable', editable);
    fixture.componentRef.setInput('pins', [
      {
        id: 'post',
        title: '<script>unsafe</script>',
        latitude: 0,
        longitude: 0,
        image: 'javascript:alert(1)',
      },
      { id: 'missing', title: 'No location', latitude: null, longitude: null },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    return {
      fixture,
      canvas: fixture.componentInstance,
      map,
      callbacks,
      markers,
      popup,
      library,
      removed,
    };
  }
  it('renders zero coordinates, ignores missing pins and emits user selections only when editable', async () => {
    const { canvas, fixture, callbacks, markers, library } = await setup(true);
    expect(library.Map).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ center: { lat: 0, lng: 0 } }),
    );
    expect(markers).toHaveLength(1);
    const positions: Coordinates[] = [];
    canvas.positionChange.subscribe((point) => positions.push(point));
    callbacks['click']({ latLng: { lat: () => 0, lng: () => 106 } });
    markers[0].position = { lat: () => 0, lng: () => 180 };
    markers[0].dispatchEvent(new Event('gmp-dragend'));
    expect(positions).toEqual([
      { latitude: 0, longitude: 106 },
      { latitude: 0, longitude: 180 },
    ]);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    callbacks['click']({ latLng: { lat: () => 1, lng: () => 2 } });
    expect(positions).toHaveLength(2);
  });
  it('keeps popup text safe and navigates from an explicit detail link', async () => {
    const { canvas, markers, popup, callbacks } = await setup();
    const opened: string[] = [];
    canvas.pinSelected.subscribe((id) => opened.push(id));
    const positions = vi.fn();
    canvas.positionChange.subscribe(positions);
    callbacks['click']({ latLng: { lat: () => 1, lng: () => 2 } });
    expect(positions).not.toHaveBeenCalled();
    markers[0].dispatchEvent(new Event('gmp-click'));
    const content = popup.setContent.mock.calls[0][0] as HTMLElement;
    expect(content.textContent).toContain('<script>unsafe</script>');
    expect(content.querySelector('script')).toBeNull();
    expect(content.querySelector('img')).toBeNull();
    content.querySelector('a')!.click();
    expect(opened).toEqual(['post']);
  });
  it('publishes the viewport and removes listeners and markers when destroyed', async () => {
    const { canvas, fixture, callbacks, removed, markers } = await setup();
    const bounds = vi.fn();
    canvas.boundsChange.subscribe(bounds);
    callbacks['idle']();
    expect(bounds).toHaveBeenCalledWith({ south: 0, north: 1, west: 170, east: -170 });
    fixture.destroy();
    expect(removed).toHaveBeenCalledTimes(2);
    expect(markers[0].map).toBeNull();
  });
  it('shows address and an external link without loading a map for a missing location', () => {
    const fixture = TestBed.createComponent(PropertyLocationComponent);
    fixture.componentRef.setInput('address', '123 Test & Co');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-map-canvas')).toBeNull();
    expect(new URL(fixture.nativeElement.querySelector('a').href).searchParams.get('query')).toBe(
      '123 Test & Co',
    );
    fixture.componentRef.setInput('latitude', 0);
    fixture.componentRef.setInput('longitude', 0);
    fixture.componentRef.setInput('collapsible', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-map-canvas')).toBeNull();
    expect(
      new URL(fixture.nativeElement.querySelector('a').href).searchParams.get('destination'),
    ).toBe('0,0');
  });
});

describe('Places autocomplete and geolocation', () => {
  it('emits the address change before the new pin so address invalidation cannot discard a selected place', () => {
    const picker = TestBed.createComponent(LocationPickerComponent).componentInstance;
    const calls: string[] = [];
    picker.placeSelected.subscribe(() => calls.push('address'));
    picker.locationChange.subscribe(() => calls.push('location'));
    picker.selectPlace({
      latitude: 0,
      longitude: 0,
      name: '',
      address: '123 Test',
      addressLine: '123 Test',
    });
    expect(calls).toEqual(['address', 'location']);
  });
  it('requests only selected place fields and ignores late results from an older selection', async () => {
    const widget = Object.assign(document.createElement('div'), { disabled: false });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GoogleMapsService,
          useValue: {
            places: async () => ({
              PlaceAutocompleteElement: vi.fn(function () {
                return widget;
              }),
            }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(MapPlaceSearchComponent);
    const selected = vi.fn();
    fixture.componentInstance.placeSelected.subscribe(selected);
    fixture.detectChanges();
    await fixture.whenStable();
    let finishFirst!: () => void;
    const first: MapsPlaceResult = {
      location: { lat: () => 1, lng: () => 2 },
      fetchFields: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishFirst = resolve;
          }),
      ),
    };
    const second: MapsPlaceResult = {
      location: { lat: () => 0, lng: () => 0 },
      formattedAddress: 'Địa chỉ Google',
      fetchFields: vi.fn(async () => undefined),
    };
    widget.dispatchEvent(
      Object.assign(new Event('gmp-select'), { placePrediction: { toPlace: () => first } }),
    );
    widget.dispatchEvent(
      Object.assign(new Event('gmp-select'), { placePrediction: { toPlace: () => second } }),
    );
    await Promise.resolve();
    finishFirst();
    await Promise.resolve();
    expect(second.fetchFields).toHaveBeenCalledWith({
      fields: ['displayName', 'formattedAddress', 'location'],
    });
    expect(selected).toHaveBeenCalledExactlyOnceWith({
      latitude: 0,
      longitude: 0,
      address: 'Địa chỉ Google',
      name: '',
    });
    fixture.destroy();
    expect(widget.parentElement).toBeNull();
  });
  it('ignores a geolocation response after the form address has changed', async () => {
    let resolve!: (point: Coordinates) => void;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GeolocationService,
          useValue: {
            locate: () =>
              new Promise<Coordinates>((finish) => {
                resolve = finish;
              }),
          },
        },
      ],
    });
    const picker = TestBed.createComponent(LocationPickerComponent).componentInstance;
    const selected = vi.fn();
    picker.locationChange.subscribe(selected);
    const pending = picker.locate();
    picker.ngOnChanges({ addressContext: new SimpleChange('old address', 'new address', false) });
    resolve({ latitude: 10, longitude: 106 });
    await pending;
    expect(selected).not.toHaveBeenCalled();
  });
  it('does not request geolocation automatically and preserves a deliberate pin selection over a late position', async () => {
    let resolve!: (point: Coordinates) => void;
    const locate = vi.fn(
      () =>
        new Promise<Coordinates>((finish) => {
          resolve = finish;
        }),
    );
    TestBed.configureTestingModule({
      providers: [{ provide: GeolocationService, useValue: { locate } }],
    });
    const picker = TestBed.createComponent(LocationPickerComponent).componentInstance;
    expect(locate).not.toHaveBeenCalled();
    const selected = vi.fn();
    picker.locationChange.subscribe(selected);
    const pending = picker.locate();
    picker.select({ latitude: 0, longitude: 0 });
    resolve({ latitude: 10, longitude: 106 });
    await pending;
    expect(selected).toHaveBeenCalledExactlyOnceWith({ latitude: 0, longitude: 0 });
    expect(picker.locating()).toBe(false);
  });
  it('keeps manual selection available when geolocation is denied', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GeolocationService,
          useValue: { locate: () => Promise.reject(new Error('Bạn chưa cho phép định vị.')) },
        },
      ],
    });
    const picker = TestBed.createComponent(LocationPickerComponent).componentInstance;
    await picker.locate();
    expect(picker.error()).toContain('chưa cho phép');
    expect(picker.locating()).toBe(false);
    const selected = vi.fn();
    picker.locationChange.subscribe(selected);
    picker.select({ latitude: 0, longitude: 0 });
    expect(picker.error()).toBe('');
    expect(selected).toHaveBeenCalledOnce();
  });
});

describe('Map search modes', () => {
  afterEach(() => vi.useRealTimers());
  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: GeolocationService, useValue: {} }] });
    const component = TestBed.createComponent(ListingMapComponent).componentInstance;
    component.ngOnInit();
    const filters: (LocationFilter | null)[] = [];
    component.locationFilter.subscribe((filter) => filters.push(filter));
    return { component, filters };
  }
  it('debounces map movements and never combines a stale viewport with the selected radius', async () => {
    vi.useFakeTimers();
    const { component, filters } = setup();
    component.boundsChanged({ south: 0, north: 1, west: 10, east: 11 });
    component.boundsChanged({ south: 0, north: 2, west: 10, east: 12 });
    await vi.advanceTimersByTimeAsync(449);
    expect(filters).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(filters).toEqual([{ kind: 'bounds', south: 0, north: 2, west: 10, east: 12 }]);
    component.boundsChanged({ south: 0, north: 3, west: 10, east: 13 });
    component.selectPlace({ latitude: 0, longitude: 0, address: 'Here', name: 'School' });
    await vi.advanceTimersByTimeAsync(500);
    expect(filters).toHaveLength(2);
    expect(filters[1]).toEqual({ kind: 'radius', latitude: 0, longitude: 0, radiusKm: 3 });
  });
  it('keeps the radius selection mode when clearing an old viewport before choosing a center', () => {
    const { component, filters } = setup();
    component.query = { south: 0, north: 1, west: 10, east: 11 };
    component.changeMode('radius');
    const previous = component.query;
    component.query = {};
    component.ngOnChanges({ query: new SimpleChange(previous, {}, false) });
    expect(component.mode()).toBe('radius');
    expect(filters).toEqual([null]);
  });
  it('keeps server ordering, omits missing pins, and preserves the current-page count', () => {
    const { component } = setup();
    const item = (id: string, latitude: number | null) =>
      ({
        id,
        listingTitle: id,
        price: 100,
        thumbnail: '',
        property: { latitude, longitude: 0 },
      }) as PublicListing;
    component.result = {
      items: [item('priority-first', 1), item('missing', null), item('zero', 0)],
      page: 1,
      total: 30,
      totalPages: 3,
    };
    expect(component.pins().map((pin) => pin.id)).toEqual(['priority-first', 'zero']);
    expect(component.missingPins()).toBe(1);
    expect(component.result.total).toBe(30);
  });
});
