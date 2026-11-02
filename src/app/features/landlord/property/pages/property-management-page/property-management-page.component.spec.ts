import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { PropertyManagementPageComponent } from './property-management-page.component';
import { PropertyService } from '@services/property/property.service';
import { Room, RoomRentalStatus } from '@model/room/room.model';
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
const room = (propertyId: string): Room => ({
  id: 'house',
  propertyId,
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
    (fixture.nativeElement.querySelector('.property-name') as HTMLButtonElement).click();
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
    second.rooms = [room(second.id)];
    component.select(second);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.whole-house')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.unit-filters')).toBeNull();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Giá thuê nguyên căn');
    expect(fixture.nativeElement.textContent).not.toContain('Tổng đơn vị cho thuê');
  });

  it('keeps room actions, filters and deletion restrictions in the shared table', () => {
    const { fixture, component, first } = setup();
    first.rooms = [
      {
        ...room(first.id),
        id: 'a',
        displayName: 'Phòng A',
        roomNumber: '101',
        floorNumber: 1,
        bookingAvailability: 'AVAILABLE',
      },
      {
        ...room(first.id),
        id: 'b',
        displayName: 'Phòng B',
        roomNumber: '201',
        floorNumber: 2,
        bookingAvailability: 'RENTED',
        rentalStatus: RoomRentalStatus.RENTED,
      },
    ];
    const edit = vi.spyOn(component, 'edit').mockImplementation(() => {});
    const images = vi.spyOn(component, 'images').mockImplementation(() => {});
    const detail = vi.spyOn(component, 'detail').mockImplementation(() => {});
    component.select(first);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('app-management-table')).toHaveLength(1);
    (element.querySelector('[aria-label="Sửa Phòng A"]') as HTMLButtonElement).click();
    (element.querySelector('[aria-label="Ảnh Phòng A"]') as HTMLButtonElement).click();
    (element.querySelector('[aria-label="Chi tiết Phòng A"]') as HTMLButtonElement).click();
    expect(edit).toHaveBeenCalledWith(first.rooms[0]);
    expect(images).toHaveBeenCalledWith(first.rooms[0]);
    expect(detail).toHaveBeenCalledWith(first.rooms[0]);
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Xóa Phòng A"]')?.disabled).toBe(
      false,
    );
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Xóa Phòng B"]')?.disabled).toBe(
      true,
    );
    const filter = element.querySelector<HTMLSelectElement>('.status-filter')!;
    filter.value = 'RENTED';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(element.querySelectorAll('app-management-table')).toHaveLength(1);
    expect(element.querySelector('.room-name')?.textContent).toContain('Phòng B');
    const search = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'Không tồn tại';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelector('app-management-table')?.textContent).toContain(
      'Không có phòng phù hợp',
    );
  });

  it('requests the first server page with the chosen property page size', () => {
    const { fixture, component, getMine } = setup();
    expect(getMine).toHaveBeenLastCalledWith(0, 10);
    component.load(2);
    expect(getMine).toHaveBeenLastCalledWith(2, 10);
    const select = fixture.nativeElement.querySelector('.page-size select') as HTMLSelectElement;
    select.value = '5';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.pageSize()).toBe(5);
    expect(getMine).toHaveBeenLastCalledWith(0, 5);
  });

  it('paginates local rooms and resets the page when size or filters change', () => {
    const { fixture, component, first } = setup();
    first.rooms = Array.from({ length: 23 }, (_, index) => ({
      ...room(first.id),
      id: String(index),
      roomNumber: String(index + 1),
      displayName: `Phòng ${index + 1}`,
      floorNumber: 1,
    }));
    component.select(first);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
    element.querySelectorAll<HTMLButtonElement>('.table-pagination button')[1].click();
    fixture.detectChanges();
    expect(element.querySelector('.room-name')?.textContent).toContain('Phòng 11');
    const select = element.querySelector<HTMLSelectElement>('.page-size select')!;
    select.value = '20';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(20);
    expect(element.querySelector('.room-name')?.textContent).toContain('Phòng 1');
    element.querySelectorAll<HTMLButtonElement>('.table-pagination button')[1].click();
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    const search = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'Phòng 2';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelector('.room-name')?.textContent).toContain('Phòng 2');
    expect(
      element.querySelectorAll<HTMLButtonElement>('.table-pagination button')[0].disabled,
    ).toBe(true);
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
