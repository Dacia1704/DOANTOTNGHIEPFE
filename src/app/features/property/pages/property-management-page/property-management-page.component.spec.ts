import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { PropertyManagementPageComponent } from './property-management-page.component';
import { PropertyService } from '@services/property.service';
import { RoomRentalStatus } from '@model/room/room.model';
import { Property } from '@model/property/property.model';

const property = (id: string, mode: 'WHOLE' | 'BY_ROOM'): Property => ({
  id,
  name: id,
  propertyTypeId: 'type',
  propertyTypeName: 'Nhà trọ',
  rentalMode: mode,
  rentalModeLabel: mode === 'WHOLE' ? 'Cho thuê nguyên căn' : 'Cho thuê từng phòng',
  totalFloors: null,
  fullAddress: '123 Test',
  amenities: [],
  images: [],
  rooms: [],
  availableCount: 0,
  rentedCount: 0,
  maintenanceCount: 0,
  minPrice: null,
  maxPrice: null,
  createdAt: null,
});
describe('Unified property management', () => {
  function setup() {
    const first = property('Cơ sở A', 'BY_ROOM');
    const second = property('Căn nhà B', 'WHOLE');
    const getMine = vi.fn(() => of({ items: [first, second], page: 0, total: 2, totalPages: 1 }));
    const getById = vi.fn((id: string) => of(id === first.id ? first : second));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PropertyService, useValue: { getMine, getById } },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(PropertyManagementPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, getMine, getById, first, second };
  }
  it('starts with only the property list and opens the clicked property', () => {
    const { fixture, component, first, getById } = setup();
    expect(component.selected()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-property-rooms')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Xem tất cả phòng');
    (fixture.nativeElement.querySelector('.property-choice') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(getById).toHaveBeenCalledWith(first.id);
    expect(component.selected()?.id).toBe(first.id);
    expect(fixture.nativeElement.querySelector('.property-list')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Phòng cho thuê riêng');
    component.backToList();
    fixture.detectChanges();
    expect(component.selected()).toBeNull();
    expect(fixture.nativeElement.querySelector('.property-list')).not.toBeNull();
  });
  it('renders whole-house fields and does not render the per-room list', () => {
    const { fixture, component, second } = setup();
    second.rooms = [
      {
        id: 'house',
        propertyId: second.id,
        roomNumber: 'WHOLE',
        displayName: 'Toàn bộ cơ sở',
        floorNumber: null,
        landlordId: 'owner',
        roomTypeId: 'house-type',
        provinceId: 'province',
        provinceName: 'Hà Nội',
        wardId: 'ward',
        wardName: 'Phường A',
        addressLine: '123 Test',
        fullAddress: '123 Test',
        latitude: null,
        longitude: null,
        thumbnail: '',
        createdAt: null,
        updatedAt: null,
        price: 12000000,
        areaM2: 100,
        maxOccupants: 6,
        amenities: [],
        images: [],
        roomTypeName: 'Nhà nguyên căn',
        rentalStatus: RoomRentalStatus.AVAILABLE,
        defaultDeposit: null,
        electricityPrice: null,
        waterPrice: null,
        serviceFee: null,
      },
    ];
    component.select(second);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.whole-house')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.unit-filters')).toBeNull();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Giá thuê nguyên căn');
    expect(fixture.nativeElement.textContent).not.toContain('Tổng đơn vị cho thuê');
  });
  it('cancels a previous detail request when another property is opened', () => {
    const { component, getById, first, second } = setup();
    const slow = new Subject<Property>();
    getById.mockReturnValueOnce(slow);
    component.select(first);
    component.select(second);
    slow.next(first);
    expect(component.selected()?.id).toBe(second.id);
  });
});
