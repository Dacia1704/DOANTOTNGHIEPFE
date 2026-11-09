import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PublicListingService } from './public-listing.service';
import { RoomRentalStatus } from '@model/room/room.model';
import { PublicListingResponse } from '@model/public-listing/response/public-listing-response';

describe('Public listing API', () => {
  it('loads aggregate prices filtered by the province and ward IDs from the database', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(PublicListingService);
    const http = TestBed.inject(HttpTestingController);
    const rows = [{ areaId: 'ward', areaName: 'Phường A', averagePrice: 2750000, roomCount: 20 }];
    let result: unknown;
    service.priceStatistics('province', 'ward').subscribe((data) => {
      result = data;
    });
    const request = http.expectOne((req) => req.url === '/api/listings/price-statistics');
    expect(request.request.params.get('provinceId')).toBe('province');
    expect(request.request.params.get('wardId')).toBe('ward');
    request.flush({ data: rows });
    expect(result).toEqual(rows);
    http.verify();
  });
  it('requests every map pin with the same filters and no pagination limit', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(PublicListingService);
    const http = TestBed.inject(HttpTestingController);
    service
      .searchMap({ page: 3, size: 12, maxPrice: 3000000, amenityNames: ['WiFi'] })
      .subscribe((items) => expect(items).toEqual([]));
    const request = http.expectOne((req) => req.url === '/api/listings/map');
    expect(request.request.params.has('page')).toBe(false);
    expect(request.request.params.has('size')).toBe(false);
    expect(request.request.params.get('maxPrice')).toBe('3000000');
    expect(request.request.params.getAll('amenityNames')).toEqual(['WiFi']);
    request.flush({ data: [] });
    http.verify();
  });
  it('reveals the phone only through an explicit POST and handles a missing phone', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(PublicListingService);
    const http = TestBed.inject(HttpTestingController);
    let phone: string | null = null;
    service.revealPhone('post').subscribe((value) => (phone = value));
    const request = http.expectOne('/api/listings/post/reveal-phone');
    expect(request.request.method).toBe('POST');
    request.flush({ data: { phone: '0901234567' } });
    expect(phone).toBe('0901234567');
    service.revealPhone('no-phone').subscribe((value) => (phone = value));
    http.expectOne('/api/listings/no-phone/reveal-phone').flush({ data: { phone: null } });
    expect(phone).toBeNull();
    http.verify();
  });

  it('loads the public listing endpoint with filters and maps its actual title and room', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(PublicListingService);
    const http = TestBed.inject(HttpTestingController);
    let title = '';
    let roomId = '';
    let listingId = '';
    service.search({ page: 1, minPrice: 0, amenityNames: ['WiFi'] }).subscribe((result) => {
      title = result.items[0].listingTitle;
      roomId = result.items[0].property.rooms[0].id;
      listingId = result.items[0].listingId;
    });
    const request = http.expectOne((req) => req.url === '/api/listings');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('minPrice')).toBe('0');
    expect(request.request.params.getAll('amenityNames')).toEqual(['WiFi']);
    const listing = {
      id: 'post',
      title: 'Căn nhà có sân vườn',
      description: '',
      status: 'PUBLISHED',
      priorityLevel: 0,
      propertyName: 'Căn nhà',
      rentalMode: 'WHOLE',
      publishedAt: '2026-10-27T10:00:00',
      expiresAt: '2026-11-27T10:00:00',
      propertyId: 'property',
      property: {
        id: 'property',
        landlordId: 'owner',
        name: 'Căn nhà',
        propertyTypeId: 'type',
        propertyTypeName: 'Nhà riêng',
        rentalMode: 'WHOLE',
        totalFloors: 2,
        provinceId: 'p',
        provinceName: 'Hà Nội',
        wardId: 'w',
        wardName: 'Phường A',
        addressLine: '123 Test',
        latitude: null,
        longitude: null,
        amenities: [],
        images: [],
        rooms: [
          {
            propertyId: 'property',
            floorNumber: null,
            landlordId: 'owner',
            roomTypeId: 'type',
            roomTypeName: 'Nhà nguyên căn',
            maxOccupants: 6,
            provinceId: 'p',
            provinceName: 'Hà Nội',
            wardId: 'w',
            wardName: 'Phường A',
            addressLine: '123 Test',
            electricityPrice: null,
            waterPrice: null,
            serviceFee: null,
            defaultDeposit: null,
            latitude: null,
            longitude: null,
            rentalStatus: RoomRentalStatus.AVAILABLE,
            id: 'room',
            roomNumber: 'WHOLE',
            price: 3000000,
            areaM2: 25,
            amenities: [],
            images: [],
          },
        ],
      },
    } as PublicListingResponse;
    request.flush({ data: { currentPage: 1, totalPages: 2, totalElements: 13, data: [listing] } });
    expect(title).toBe('Căn nhà có sân vườn');
    expect(roomId).toBe('room');
    expect(listingId).toBe('post');
    http.expectNone((req) => req.url.includes('/rooms'));
    http.verify();
  });
});
