import { TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { vi } from 'vitest';
import { MapTilerService } from '@services/maps/maptiler.service';
import { GeolocationService } from '@services/maps/geolocation.service';
import { MapCanvasComponent } from './map-canvas/map-canvas.component';
import { MapPlaceSearchComponent } from './map-place-search/map-place-search.component';
import { PropertyLocationComponent } from './property-location/property-location.component';
import { LocationPickerComponent } from './location-picker/location-picker.component';
import { ListingMapComponent } from '../../features/tenant/landing/components/listing-map/listing-map.component';
import { Coordinates, LocationFilter } from '@model/maps/maps.model';
import { PublicListing } from '@model/public-listing/public-listing.model';

describe('Map rendering and selection', () => {
  async function setup(editable = false) {
    const callbacks: Record<string, (event?: any) => void> = {};
    const source = { setData: vi.fn() };
    let hasSource = false;
    const map = {
      on: vi.fn((event: string, callback: (event?: any) => void) => {
        callbacks[event] = callback;
      }),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      remove: vi.fn(),
      resize: vi.fn(),
      addControl: vi.fn(),
      isStyleLoaded: () => true,
      getBounds: () => ({
        getSouth: () => 0,
        getNorth: () => 1,
        getWest: () => 170,
        getEast: () => 190,
      }),
      getSource: () => (hasSource ? source : undefined),
      addSource: vi.fn(() => {
        hasSource = true;
      }),
      addLayer: vi.fn(),
    };
    const markers: any[] = [];
    const popup: any = { remove: vi.fn() };
    popup.setDOMContent = vi.fn(() => popup);
    popup.setLngLat = vi.fn(() => popup);
    popup.addTo = vi.fn(() => popup);
    const library = {
      Map: vi.fn(function () {
        return map;
      }),
      Marker: vi.fn(function (options: any) {
        const marker: any = {
          element: options.element,
          options,
          callbacks: {},
          remove: vi.fn(),
          getLngLat: () => ({ lat: 0, lng: 180, wrap: () => ({ lat: 0, lng: 180 }) }),
        };
        marker.setLngLat = vi.fn(() => marker);
        marker.addTo = vi.fn(() => marker);
        marker.on = vi.fn((event, callback) => {
          marker.callbacks[event] = callback;
          return marker;
        });
        markers.push(marker);
        return marker;
      }),
      Popup: vi.fn(function () {
        return popup;
      }),
      NavigationControl: vi.fn(function () {}),
      FullscreenControl: vi.fn(function () {}),
      ScaleControl: vi.fn(function () {}),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MapTilerService,
          useValue: {
            load: vi.fn(async () => library),
            styleUrl: () => 'https://example.test/style.json',
            localize: vi.fn(),
            config: { markerColor: '#006b5e', radiusColor: '#00897b' },
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
    callbacks['style.load']();
    callbacks['load']();
    return {
      fixture,
      canvas: fixture.componentInstance,
      map,
      callbacks,
      markers,
      popup,
      library,
      source,
    };
  }
  it('renders zero coordinates, ignores missing pins and permits editing only when enabled', async () => {
    const { canvas, fixture, callbacks, markers, library } = await setup(true);
    expect(library.Map).toHaveBeenCalledWith(expect.objectContaining({ center: [0, 0], pitch: 0 }));
    expect(markers).toHaveLength(1);
    const positions: Coordinates[] = [];
    canvas.positionChange.subscribe((point) => positions.push(point));
    callbacks['click']({ lngLat: { lat: 0, wrap: () => ({ lng: 106 }) } });
    markers[0].callbacks['dragend']();
    expect(positions).toEqual([
      { latitude: 0, longitude: 106 },
      { latitude: 0, longitude: 180 },
    ]);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    callbacks['click']({ lngLat: { lat: 1, wrap: () => ({ lng: 2 }) } });
    expect(positions).toHaveLength(2);
    expect(markers.at(-1).options.draggable).toBe(false);
    fixture.destroy();
  });
  it('recenters on the same coordinates when the location button is pressed again', async () => {
    const { fixture, map } = await setup();
    fixture.componentRef.setInput('center', { latitude: 10, longitude: 106 });
    fixture.detectChanges();
    map.setCenter.mockClear();
    fixture.componentRef.setInput('recenterToken', 1);
    fixture.detectChanges();
    expect(map.setCenter).toHaveBeenCalledWith([106, 10]);
    fixture.destroy();
  });
  it('marks the actual user position separately from the search center and removes it when cleared', async () => {
    const { fixture, markers } = await setup();
    fixture.componentRef.setInput('userPosition', { latitude: 0, longitude: 0 });
    fixture.detectChanges();
    const userMarker = markers.at(-1);
    expect(userMarker.element.getAttribute('aria-label')).toBe('Vị trí của bạn');
    expect(userMarker.options).toEqual(
      expect.objectContaining({ anchor: 'center', draggable: false }),
    );
    expect(userMarker.setLngLat).toHaveBeenCalledWith([0, 0]);
    fixture.componentRef.setInput('center', { latitude: 20, longitude: 105 });
    fixture.detectChanges();
    const retained = markers.at(-1);
    expect(retained.setLngLat).toHaveBeenCalledWith([0, 0]);
    fixture.componentRef.setInput('userPosition', null);
    fixture.detectChanges();
    expect(retained.remove).toHaveBeenCalled();
    expect(markers.at(-1).element.className).not.toContain('rental-map-user-position');
    fixture.destroy();
  });
  it('keeps popup text safe and navigates from an explicit detail link', async () => {
    const { canvas, fixture, markers, popup, callbacks } = await setup();
    const opened: string[] = [];
    canvas.pinSelected.subscribe((id) => opened.push(id));
    const positions = vi.fn();
    canvas.positionChange.subscribe(positions);
    callbacks['click']({ lngLat: { lat: 1, lng: 2 } });
    expect(positions).not.toHaveBeenCalled();
    markers[0].element.click();
    const content = popup.setDOMContent.mock.calls[0][0] as HTMLElement;
    expect(content.textContent).toContain('<script>unsafe</script>');
    expect(content.querySelector('script')).toBeNull();
    expect(content.querySelector('img')).toBeNull();
    content.querySelector('a')!.click();
    expect(opened).toEqual(['post']);
    fixture.destroy();
  });
  it('normalizes dateline-crossing bounds and disposes the WebGL map and markers', async () => {
    const { canvas, fixture, callbacks, map, markers } = await setup();
    const bounds = vi.fn();
    canvas.boundsChange.subscribe(bounds);
    callbacks['moveend']();
    expect(bounds).toHaveBeenCalledWith({ south: 0, north: 1, west: 170, east: -170 });
    fixture.destroy();
    expect(map.remove).toHaveBeenCalledOnce();
    expect(markers[0].remove).toHaveBeenCalledOnce();
  });
  it('renders a geodesic radius and clears it when radius is removed', async () => {
    const { fixture, source } = await setup();
    fixture.componentRef.setInput('center', { latitude: 0, longitude: 0 });
    fixture.componentRef.setInput('radiusKm', 3);
    fixture.detectChanges();
    const ring = source.setData.mock.calls.at(-1)![0].features[0].geometry.coordinates[0];
    expect(ring[0][0]).toBeCloseTo(0);
    expect(ring[0][1]).toBeCloseTo(((3 / 6371.0088) * 180) / Math.PI);
    expect(ring[0]).toEqual(ring.at(-1));
    fixture.componentRef.setInput('radiusKm', 0);
    fixture.detectChanges();
    expect(source.setData.mock.calls.at(-1)![0].features).toEqual([]);
    fixture.destroy();
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
    expect(new URL(fixture.nativeElement.querySelector('a').href).searchParams.get('route')).toBe(
      ';0,0',
    );
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
  it('debounces geocoding, cancels old results and emits selected street addresses', async () => {
    vi.useFakeTimers();
    try {
      let finishFirst!: (places: any[]) => void;
      const search = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finishFirst = resolve;
            }),
        )
        .mockResolvedValueOnce([
          {
            latitude: 0,
            longitude: 0,
            address: '12 Phố A',
            name: 'Phố A',
            addressLine: '12 Phố A',
          },
        ]);
      TestBed.configureTestingModule({
        providers: [{ provide: MapTilerService, useValue: { search } }],
      });
      const fixture = TestBed.createComponent(MapPlaceSearchComponent);
      fixture.componentRef.setInput('includeStreetAddress', true);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      const selected = vi.fn();
      component.placeSelected.subscribe(selected);
      component.search('old');
      await vi.advanceTimersByTimeAsync(350);
      const oldSignal = search.mock.calls[0][1] as AbortSignal;
      component.search('new');
      expect(oldSignal.aborted).toBe(true);
      await vi.advanceTimersByTimeAsync(349);
      expect(search).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      finishFirst([{ latitude: 1, longitude: 2, address: 'old', name: '' }]);
      await Promise.resolve();
      expect(component.results()[0].address).toBe('12 Phố A');
      component.select(component.results()[0]);
      expect(selected).toHaveBeenCalledExactlyOnceWith({
        latitude: 0,
        longitude: 0,
        address: '12 Phố A',
        name: 'Phố A',
        addressLine: '12 Phố A',
      });
      expect(component.results()).toEqual([]);
      component.search('pending');
      fixture.destroy();
      await vi.advanceTimersByTimeAsync(350);
      expect(search).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
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
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GeolocationService,
          useValue: {
            locate: vi.fn(async () => ({ latitude: 10, longitude: 106 })),
          },
        },
      ],
    });
    const component = TestBed.createComponent(ListingMapComponent).componentInstance;
    component.ngOnInit();
    const filters: (LocationFilter | null)[] = [];
    component.locationFilter.subscribe((filter) => filters.push(filter));
    return { component, filters };
  }
  it('centers on my location and loads the viewport without imposing a three-kilometer radius', async () => {
    const { component, filters } = setup();
    const located = vi.fn();
    component.userLocated.subscribe(located);
    await component.locate();
    expect(component.center()).toEqual({ latitude: 10, longitude: 106 });
    expect(component.mode()).toBe('viewport');
    expect(located).toHaveBeenCalledWith({ latitude: 10, longitude: 106 });
    expect(filters).toEqual([null]);
  });
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
