import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { TenantPreferencesComponent } from './tenant-preferences.component';
import { TenantPreferencesService } from '@services/identity/tenant-preferences.service';
import { AddressService } from '@services/address/address.service';
import { AmenityService } from '@services/room/amenity.service';
import { RoomTypeService } from '@services/room/room-type.service';

describe('rental preferences destinations', () => {
  const save = vi.fn();
  beforeEach(() => {
    save.mockReset().mockImplementation((body) => of(body));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TenantPreferencesService,
          useValue: { get: () => of(null), places: () => of([]), save },
        },
        {
          provide: AddressService,
          useValue: { getProvinces: () => of([]), getAllWards: () => of([]) },
        },
        { provide: AmenityService, useValue: { getAllAmenities: () => of([]) } },
        { provide: RoomTypeService, useValue: { getAllRoomTypes: () => of([]) } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
  });
  it('replaces a catalogue destination with a nameless map point and persists its exact coordinates', () => {
    const c = TestBed.createComponent(TenantPreferencesComponent).componentInstance;
    c.selectPlace({
      id: 'university',
      name: 'University',
      category: 'UNIVERSITY',
      address: null,
      latitude: 21,
      longitude: 105,
    });
    c.mapPosition({ latitude: 10.12345678, longitude: 106.12345678 });
    c.save();
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0]).toMatchObject({
      anchorPlaceId: null,
      anchorLabel: null,
      anchorLatitude: 10.12345678,
      anchorLongitude: 106.12345678,
    });
    expect(c.point()).toEqual({ latitude: 10.12345678, longitude: 106.12345678 });
  });
  it('clears every destination field and permits a custom label', () => {
    const c = TestBed.createComponent(TenantPreferencesComponent).componentInstance;
    c.mapPosition({ latitude: 21, longitude: 105 });
    c.form.controls.anchorLabel.setValue('My workplace');
    c.save();
    expect(save.mock.calls[0][0].anchorLabel).toBe('My workplace');
    c.clearPlace();
    c.save();
    expect(save.mock.calls[1][0]).toMatchObject({
      anchorPlaceId: null,
      anchorLabel: null,
      anchorLatitude: null,
      anchorLongitude: null,
    });
    expect(c.pins()).toEqual([]);
  });
  it('blocks inverted ranges and incomplete coordinates, and removes required status with an amenity', () => {
    const c = TestBed.createComponent(TenantPreferencesComponent).componentInstance;
    c.budget(5000000, 3000000);
    c.save();
    expect(save).not.toHaveBeenCalled();
    c.budget(3000000, 5000000);
    c.form.controls.anchorLatitude.setValue(21);
    c.save();
    expect(save).not.toHaveBeenCalled();
    c.clearPlace();
    c.toggleAmenity('wifi');
    c.toggleRequired('wifi');
    c.toggleAmenity('wifi');
    c.save();
    expect(save.mock.calls[0][0].requiredAmenityIds).toEqual([]);
  });
});
