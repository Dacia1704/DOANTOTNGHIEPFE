import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AdvancedFiltersComponent } from './advanced-filters.component';
import { SearchCapsuleComponent } from '../search-capsule/search-capsule.component';
import { AddressService } from '@services/address/address.service';
import { AmenityService } from '@services/room/amenity.service';
import { RoomTypeService } from '@services/room/room-type.service';
import { RoomRentalStatus } from '@model/room/room.model';
import { Ward } from '@model/address/ward.model';

describe('advanced landing filters', () => {
  const wards = vi.fn();
  beforeEach(() => {
    wards.mockReset().mockReturnValue(of([{ id: 'w', name: 'Phường A' }]));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AddressService,
          useValue: { getProvinces: () => of([{ id: 'p', name: 'Hà Nội' }]), getAllWards: wards },
        },
        {
          provide: AmenityService,
          useValue: { getAllAmenities: () => of([{ id: 'wifi', name: 'Wifi' }]) },
        },
        {
          provide: RoomTypeService,
          useValue: { getAllRoomTypes: () => of([{ id: 'studio', name: 'Studio' }]) },
        },
      ],
    });
  });
  it('keeps draft selections private until apply, then emits custom prices and all selected amenities', () => {
    const c = TestBed.createComponent(AdvancedFiltersComponent).componentInstance;
    const apply = vi.fn();
    c.apply.subscribe(apply);
    c.form.patchValue({
      provinceId: 'p',
      wardId: 'w',
      roomTypeName: 'Studio',
      minPrice: 2250000,
      maxPrice: 4750000,
    });
    c.toggleAmenity('Wifi');
    c.toggleAmenity('Điều hòa');
    expect(apply).not.toHaveBeenCalled();
    c.submit();
    expect(apply).toHaveBeenCalledWith({
      query: {
        provinceId: 'p',
        wardId: 'w',
        roomTypeName: 'Studio',
        minPrice: 2250000,
        maxPrice: 4750000,
        rentalStatus: RoomRentalStatus.AVAILABLE,
        amenityNames: ['Wifi', 'Điều hòa'],
      },
      labels: { province: 'Hà Nội', ward: 'Phường A' },
    });
  });
  it('blocks inverted or negative prices and accepts a zero lower bound', () => {
    const c = TestBed.createComponent(AdvancedFiltersComponent).componentInstance;
    const apply = vi.fn();
    c.apply.subscribe(apply);
    c.budget(5000000, 3000000);
    c.submit();
    expect(apply).not.toHaveBeenCalled();
    c.budget(-1, 3000000);
    c.submit();
    expect(apply).not.toHaveBeenCalled();
    c.budget(0, 3000000);
    c.submit();
    expect(apply.mock.calls[0][0].query.minPrice).toBe(0);
  });
  it('clears the ward when switching provinces and ignores older responses', () => {
    const c = TestBed.createComponent(AdvancedFiltersComponent).componentInstance;
    const slow = new Subject<Ward[]>();
    wards.mockReturnValueOnce(slow);
    c.form.controls.provinceId.setValue('old');
    c.form.controls.wardId.setValue('old-ward');
    c.form.controls.provinceId.setValue('p');
    slow.next([{ id: 'stale' } as Ward]);
    expect(c.form.controls.wardId.value).toBe('');
    expect(c.wards()[0].id).toBe('w');
  });
  it('preserves applied custom price bounds when searching again from the hero', () => {
    const c = TestBed.createComponent(SearchCapsuleComponent).componentInstance;
    c.appliedFilters = {
      minPrice: 2250000,
      maxPrice: 4750000,
      rentalStatus: RoomRentalStatus.AVAILABLE,
    };
    const search = vi.fn();
    c.search.subscribe(search);
    expect(c.priceRange()).toBe('custom');
    c.onSubmit(new Event('submit'));
    expect(search.mock.calls[0][0]).toMatchObject({ minPrice: 2250000, maxPrice: 4750000 });
  });
});
