import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PropertyFormDialogComponent } from './property-form-dialog.component';
import { PropertyService } from '@services/property.service';
import { PropertyTypeService } from '@services/property-type.service';
import { RoomTypeService } from '@services/room-type.service';
import { AmenityService } from '@services/amenity.service';
import { AddressService } from '@services/address.service';
import { CreatePropertyRequest } from '@model/property/request/create-property-request';
import { PropertyMapper } from '@model/property/property.mapper';
import { PropertyResponse } from '@model/property/response/property-response';
import { RoomUtils } from '@shared/utils/room-utils';

describe('Property creation and data semantics', () => {
  const create = vi.fn();
  const close = vi.fn();
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        { provide: PropertyService, useValue: { create } },
        {
          provide: PropertyTypeService,
          useValue: { getAll: () => of([{ id: 'pt', name: 'Nhà trọ' }]) },
        },
        {
          provide: RoomTypeService,
          useValue: { getAllRoomTypes: () => of([{ id: 'rt', name: 'Studio' }]) },
        },
        { provide: AmenityService, useValue: { getAllAmenities: () => of([]) } },
        {
          provide: AddressService,
          useValue: { getProvinces: () => of([{ id: 'p', name: 'Hà Nội' }]), getAllWards: () => of([]) },
        },
        { provide: MatDialogRef, useValue: { close, disableClose: false } },
      ],
    });
    const fixture = TestBed.createComponent(PropertyFormDialogComponent);
    const component = fixture.componentInstance;
    component.info.patchValue({
      name: '  An Nhiên  ',
      propertyTypeId: 'pt',
      provinceId: 'p',
      wardId: 'w',
      addressLine: '  123 Test  ',
    });
    component.defaults.patchValue({
      roomTypeId: 'rt',
      price: 3000000,
      areaM2: 25,
      maxOccupants: 2,
      serviceFee: 100000,
    });
    component.units.at(0).patchValue({ roomNumber: ' A101 ', floorNumber: 0 });
    component.loading.set(false);
    return component;
  }
  beforeEach(() => {
    create.mockReset();
    close.mockReset();
    create.mockReturnValue(of({ id: 'new' }));
  });

  it('groups explicit floors and preserves null inheritance and a zero override', () => {
    const component = setup();
    component.addUnit();
    component.units
      .at(1)
      .patchValue({ roomNumber: 'A102', floorNumber: 0, price: 3500000, serviceFee: 0 });
    const before = component.defaults.getRawValue();
    component.submit();
    const request = create.mock.calls[0][0] as CreatePropertyRequest;
    expect(request.name).toBe('An Nhiên');
    expect(request.addressLine).toBe('123 Test');
    expect(request.floors.length).toBe(1);
    expect(request.floors[0].floorNumber).toBe(0);
    expect(request.floors[0].rooms[0].price).toBeNull();
    expect(request.floors[0].rooms[1].serviceFee).toBe(0);
    expect(component.defaults.getRawValue()).toEqual(before);
    expect(close).toHaveBeenCalled();
  });
  it('keeps unspecified floors separate from ground floor', () => {
    const component = setup();
    component.addUnit();
    component.units.at(1).patchValue({ roomNumber: 'B', floorNumber: null });
    component.submit();
    expect(
      (create.mock.calls[0][0] as CreatePropertyRequest).floors.map((f) => f.floorNumber),
    ).toEqual([0, null]);
  });
  it('rejects duplicate identifiers across floors before calling the API', () => {
    const component = setup();
    component.addUnit();
    component.units.at(1).patchValue({ roomNumber: 'a101', floorNumber: 2 });
    component.submit();
    expect(create).not.toHaveBeenCalled();
    expect(component.error()).toContain('trùng');
  });
  it('rejects zero rent and fractional occupant counts', () => {
    const component = setup();
    component.defaults.patchValue({ price: 0, maxOccupants: 1.5 });
    component.submit();
    expect(create).not.toHaveBeenCalled();
    expect(component.step()).toBe(1);
  });
  it('retains entered data after an API failure and permits a deliberate retry', () => {
    const component = setup();
    create.mockReturnValue(throwError(() => ({ error: { message: 'Dữ liệu bị trùng' } })));
    component.submit();
    expect(component.error()).toBe('Dữ liệu bị trùng');
    expect(component.info.controls.name.value).toBe('  An Nhiên  ');
    expect(component.units.at(0).controls.roomNumber.value).toBe(' A101 ');
    expect(component.busy()).toBe(false);
    expect(close).not.toHaveBeenCalled();
  });
  it('never removes the final unit and never adds units in WHOLE mode', () => {
    const component = setup();
    component.info.controls.rentalMode.setValue('WHOLE');
    component.addUnit();
    component.removeUnit(0);
    expect(component.units.length).toBe(1);
  });
  it('automatically creates exactly one whole-house room without requesting an identifier', () => {
    const component = setup();
    component.addUnit();
    component.units.at(0).patchValue({ roomNumber: '', price: 999, serviceFee: 0 });
    component.units.at(1).patchValue({ roomNumber: '' });
    component.info.controls.rentalMode.setValue('WHOLE');
    component.submit();
    const request = create.mock.calls[0][0] as CreatePropertyRequest;
    expect(request.floors).toEqual([{ floorNumber: null, rooms: [{ roomNumber: 'WHOLE', amenityIds: [] }] }]);
    expect(request.defaultRoom.price).toBe(3000000);
    expect(request.defaultRoom.serviceFee).toBe(100000);
    expect(component.units.length).toBe(2);
    component.info.controls.rentalMode.setValue('BY_ROOM');
    expect(component.units.at(0).controls.price.value).toBe(999);
  });
  it('only renders per-room customization for BY_ROOM', () => {
    setup();
    const fixture = TestBed.createComponent(PropertyFormDialogComponent);
    fixture.componentInstance.info.controls.rentalMode.setValue('WHOLE');
    fixture.componentInstance.step.set(1);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-property-unit-editor')).toBeNull();
    expect(element.textContent).not.toContain('Đơn vị đại diện nguyên căn');
    expect(element.textContent).toContain('Thông tin căn nhà');
    fixture.componentInstance.info.controls.rentalMode.setValue('BY_ROOM');
    fixture.detectChanges();
    expect(element.querySelector('app-property-unit-editor')).not.toBeNull();
  });
  it('distinguishes unspecified fees from free fees', () => {
    setup();
    expect(RoomUtils.formatFee(null)).toBe('Chưa khai báo');
    expect(RoomUtils.formatFee(0)).toBe('Miễn phí');
  });
  it('derives exact property counts from its rooms and retains an unknown floor', () => {
    setup();
    const dto = {
      id: 'p',
      name: 'House',
      rentalMode: 'WHOLE',
      rooms: [
        {
          id: 'r',
          roomNumber: 'INTERNAL',
          rentalStatus: 'AVAILABLE',
          price: 100,
          floorNumber: null,
          serviceFee: null,
        },
      ],
    } as PropertyResponse;
    const property = PropertyMapper.fromResponse(dto);
    expect(property.availableCount).toBe(1);
    expect(property.rentedCount).toBe(0);
    expect(property.rooms[0].displayName).toBe('Toàn bộ cơ sở');
    expect(property.rooms[0].floorNumber).toBeNull();
    expect(property.rooms[0].serviceFee).toBeNull();
  });
});
