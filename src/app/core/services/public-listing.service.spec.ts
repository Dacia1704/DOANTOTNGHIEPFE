import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PublicListingService } from './public-listing.service';
import { RoomRentalStatus } from '@model/room/room.model';
import { PublicListingResponse } from '@model/public-listing/response/public-listing-response';

describe('Public listing API', () => {
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
