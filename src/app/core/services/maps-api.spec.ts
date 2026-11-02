import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { GoogleMapsService, GOOGLE_MAPS_CONFIG } from './google-maps.service';
import { MapsWindow } from '@model/maps/maps.model';
import { PropertyService } from './property.service';
import { PublicListingService } from './public-listing.service';
import { PropertyResponse } from '@model/property/response/property-response';
import { PropertyMapper } from '@model/property/property.mapper';
import { LocationUtils } from '@shared/utils/location-utils';
import { vi } from 'vitest';

const property: PropertyResponse = {
  id: 'property',
  landlordId: 'owner',
  name: 'Cơ sở A',
  propertyTypeId: 'type',
  propertyTypeName: 'Nhà trọ',
  rentalMode: 'BY_ROOM',
  totalFloors: null,
  provinceId: 'p',
  provinceName: 'Tỉnh A',
  wardId: 'w',
  wardName: 'Phường A',
  addressLine: '123 Test',
  latitude: 0,
  longitude: 0,
  rooms: [],
};

describe('Location data and API contracts', () => {
  it('retains zero coordinates and internal address IDs and never invents coordinates for old records', () => {
    expect(PropertyMapper.fromResponse(property)).toEqual(
      expect.objectContaining({
        latitude: 0,
        longitude: 0,
        provinceId: 'p',
        wardId: 'w',
        addressLine: '123 Test',
      }),
    );
    const old = {
      ...property,
      latitude: undefined,
      longitude: undefined,
    } as unknown as PropertyResponse;
    expect(PropertyMapper.fromResponse(old).latitude).toBeNull();
    expect(PropertyMapper.fromResponse(old).longitude).toBeNull();
    expect(LocationUtils.point(null, null)).toBeNull();
    expect(LocationUtils.point(0, 0)).toEqual({ latitude: 0, longitude: 0 });
    expect(LocationUtils.point(91, 0)).toBeNull();
    expect(LocationUtils.point(0, Infinity)).toBeNull();
  });
  it('requires both valid coordinates or neither, and keeps Maps URLs encoded and usable without a key', () => {
    const form = new FormGroup(
      {
        latitude: new FormControl<number | null>(0),
        longitude: new FormControl<number | null>(null),
      },
      { validators: LocationUtils.coordinatePair },
    );
    expect(form.hasError('coordinatePair')).toBe(true);
    form.controls.longitude.setValue(0);
    expect(form.valid).toBe(true);
    const directions = new URL(LocationUtils.directions(0, 0, 'ignored'));
    expect(directions.searchParams.get('destination')).toBe('0,0');
    expect(directions.searchParams.get('api')).toBe('1');
    const search = new URL(LocationUtils.directions(null, null, '12 A & B, Hà Nội'));
    expect(search.searchParams.get('query')).toBe('12 A & B, Hà Nội');
    expect(search.searchParams.has('destination')).toBe(false);
  });
  it('sends the complete location replacement body without modifying rooms, prices or amenities', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(PropertyService);
    const http = TestBed.inject(HttpTestingController);
    const body = {
      provinceId: 'p',
      wardId: 'w',
      addressLine: '123 Test',
      latitude: null,
      longitude: null,
    };
    api
      .updateLocation('property/id', body)
      .subscribe((result) => expect(result.latitude).toBeNull());
    const request = http.expectOne('/api/properties/property%2Fid/location');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ data: { ...property, latitude: null, longitude: null } });
    http.verify();
  });
  it('passes radius or viewport filters, including zero and dateline crossing, alongside normal filters', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(PublicListingService);
    const http = TestBed.inject(HttpTestingController);
    api
      .search({
        latitude: 0,
        longitude: 0,
        radiusKm: 3,
        minPrice: 0,
        amenityNames: ['WiFi'],
        page: 1,
      })
      .subscribe();
    const radius = http.expectOne((req) => req.url === '/api/listings');
    expect(radius.request.params.get('latitude')).toBe('0');
    expect(radius.request.params.get('longitude')).toBe('0');
    expect(radius.request.params.get('radiusKm')).toBe('3');
    expect(radius.request.params.get('minPrice')).toBe('0');
    expect(radius.request.params.getAll('amenityNames')).toEqual(['WiFi']);
    expect(radius.request.params.has('south')).toBe(false);
    radius.flush({ data: { data: [], currentPage: 1, totalElements: 0, totalPages: 0 } });
    api
      .search({ south: 0, north: 10, west: 170, east: -170, provinceId: 'p', size: 50 })
      .subscribe();
    const viewport = http.expectOne((req) => req.url === '/api/listings');
    expect(viewport.request.params.get('south')).toBe('0');
    expect(viewport.request.params.get('west')).toBe('170');
    expect(viewport.request.params.get('east')).toBe('-170');
    expect(viewport.request.params.get('provinceId')).toBe('p');
    expect(viewport.request.params.has('radiusKm')).toBe(false);
    viewport.flush({ data: { data: [], currentPage: 0, totalElements: 0, totalPages: 0 } });
    http.verify();
  });
});

describe('Lazy Google Maps loader', () => {
  const target = window as MapsWindow;
  afterEach(() => {
    delete target.google;
    delete target.__trototMapsReady;
    delete target.gm_authFailure;
    document
      .querySelectorAll('script[src^="https://maps.googleapis.com/maps/api/js"]')
      .forEach((script) => script.remove());
    vi.useRealTimers();
  });
  function setup(apiKey = 'browser-test-key') {
    TestBed.configureTestingModule({
      providers: [{ provide: GOOGLE_MAPS_CONFIG, useValue: { apiKey, mapId: 'test-map' } }],
    });
    return TestBed.inject(GoogleMapsService);
  }
  it('does not fetch the SDK until requested and shares a single in-flight load', async () => {
    const service = setup();
    expect(document.querySelector('script[src*="maps.googleapis.com"]')).toBeNull();
    const first = service.load();
    expect(service.load()).toBe(first);
    const scripts = document.querySelectorAll<HTMLScriptElement>(
      'script[src^="https://maps.googleapis.com/maps/api/js"]',
    );
    expect(scripts).toHaveLength(1);
    expect(new URL(scripts[0].src).searchParams.get('loading')).toBe('async');
    const api = { importLibrary: vi.fn() };
    target.google = { maps: api };
    target.__trototMapsReady?.();
    await expect(first).resolves.toBe(api);
  });
  it('keeps missing configuration recoverable without loading an invalid SDK', async () => {
    const service = setup('');
    await expect(service.load()).rejects.toThrow('chưa sẵn sàng');
    expect(document.querySelector('script[src*="maps.googleapis.com"]')).toBeNull();
  });
  it('cleans up a failed load and permits retry', async () => {
    const service = setup();
    const first = service.load();
    const failure = expect(first).rejects.toThrow('Không tải được');
    document.querySelector('script[src*="maps.googleapis.com"]')!.dispatchEvent(new Event('error'));
    await failure;
    const second = service.load();
    expect(second).not.toBe(first);
    target.google = { maps: { importLibrary: vi.fn() } };
    target.__trototMapsReady?.();
    await second;
  });
  it('times out a stalled SDK request and surfaces authentication errors', async () => {
    vi.useFakeTimers();
    const service = setup();
    const timeout = expect(service.load()).rejects.toThrow('Không tải được');
    await vi.advanceTimersByTimeAsync(20000);
    await timeout;
    const authentication = expect(service.load()).rejects.toThrow('Không tải được');
    target.gm_authFailure?.();
    await authentication;
    expect(service.authError()).not.toBe('');
  });
});
