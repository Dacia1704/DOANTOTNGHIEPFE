import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { PropertyLocationDialogComponent } from './property-location-dialog.component';
import { PropertyService } from '@services/property.service';
import { AddressService } from '@services/address.service';
import { Property } from '@model/property/property.model';
import { Ward } from '@model/address/ward.model';

describe('Editing shared property location', () => {
  function setup() {
    const property = {
      id: 'property',
      name: 'Nhà A',
      provinceId: 'p',
      wardId: 'wp',
      addressLine: '123 Test',
      latitude: 0,
      longitude: 0,
    } as Property;
    const saved = { ...property, fullAddress: '123 Test, Phường A, Tỉnh A' };
    const api = { updateLocation: vi.fn(() => of(saved)) };
    const address = {
      getProvinces: () =>
        of([
          { id: 'p', name: 'Tỉnh A' },
          { id: 'q', name: 'Tỉnh B' },
        ]),
      getAllWards: vi.fn((id: string) =>
        of([{ id: `w${id}`, provinceId: id, name: 'Phường A' }] as Ward[]),
      ),
    };
    const ref = { close: vi.fn(), disableClose: false };
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: property },
        { provide: MatDialogRef, useValue: ref },
        { provide: PropertyService, useValue: api },
        { provide: AddressService, useValue: address },
      ],
    });
    const editor = TestBed.createComponent(PropertyLocationDialogComponent).componentInstance;
    editor.ngOnInit();
    return { editor, api, address, ref, saved };
  }
  it('saves the full address and the valid zero coordinate pair', () => {
    const { editor, api, ref, saved } = setup();
    editor.save();
    expect(api.updateLocation).toHaveBeenCalledExactlyOnceWith('property', {
      provinceId: 'p',
      wardId: 'wp',
      addressLine: '123 Test',
      latitude: 0,
      longitude: 0,
    });
    expect(ref.close).toHaveBeenCalledWith(saved);
  });
  it('clears the old pin when the address changes, and allows saving without a pin', () => {
    const { editor, api } = setup();
    editor.form.controls.addressLine.setValue('456 New street');
    expect(editor.form.controls.latitude.value).toBeNull();
    expect(editor.form.controls.longitude.value).toBeNull();
    expect(editor.pinCleared()).toBe(true);
    editor.save();
    expect(api.updateLocation).toHaveBeenCalledWith(
      'property',
      expect.objectContaining({ latitude: null, longitude: null, addressLine: '456 New street' }),
    );
  });
  it('applies a Google street suggestion and its new pin without replacing internal province/ward IDs', () => {
    const { editor, api } = setup();
    const place = {
      latitude: 10,
      longitude: 106,
      address: '456 Test, Another city',
      addressLine: '456 Test',
      name: 'Place',
    };
    editor.usePlaceAddress(place);
    editor.setLocation(place);
    editor.save();
    expect(api.updateLocation).toHaveBeenCalledExactlyOnceWith('property', {
      provinceId: 'p',
      wardId: 'wp',
      addressLine: '456 Test',
      latitude: 10,
      longitude: 106,
    });
    expect(editor.pinCleared()).toBe(false);
  });
  it('cancels stale ward lookups and prevents submitting a ward from the previous province', () => {
    const { editor, api, address } = setup();
    const pending = new Subject<Ward[]>();
    address.getAllWards.mockReturnValueOnce(pending);
    editor.form.controls.provinceId.setValue('q');
    editor.form.controls.provinceId.setValue('p');
    expect(pending.observed).toBe(false);
    pending.next([{ id: 'wq', provinceId: 'q' } as Ward]);
    expect(editor.wards().every((ward) => ward.provinceId === 'p')).toBe(true);
    expect(editor.form.controls.wardId.value).toBe('');
    editor.form.controls.wardId.setValue('wq');
    editor.save();
    expect(api.updateLocation).not.toHaveBeenCalled();
  });
  it('preserves entered data on access or server failure and blocks duplicate saves in flight', () => {
    const { editor, api, ref } = setup();
    api.updateLocation.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Không có quyền sửa cơ sở' } })),
    );
    editor.save();
    expect(editor.error()).toContain('Không có quyền');
    expect(editor.form.controls.addressLine.value).toBe('123 Test');
    expect(ref.close).not.toHaveBeenCalled();
    const pending = new Subject<Property>();
    api.updateLocation.mockReturnValueOnce(pending);
    editor.save();
    editor.save();
    expect(api.updateLocation).toHaveBeenCalledTimes(2);
    expect(editor.busy()).toBe(true);
    expect(ref.disableClose).toBe(true);
    pending.next({ id: 'property' } as Property);
    pending.complete();
    expect(ref.close).toHaveBeenCalledOnce();
  });
});
