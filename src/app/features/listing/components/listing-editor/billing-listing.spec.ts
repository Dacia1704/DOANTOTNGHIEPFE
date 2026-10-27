import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ListingService } from '@services/listing.service';
import { PropertyService } from '@services/property.service';
import { ListingEditorComponent } from './listing-editor.component';

describe('Billing listing prerequisites', () => {
  it('allows admin rejection with only a reason, without requiring room or new title', () => {
    const api = { action: vi.fn(() => of({})) };
    const ref = { close: vi.fn(), disableClose: false };
    TestBed.configureTestingModule({
      imports: [ListingEditorComponent],
      providers: [
        { provide: ListingService, useValue: api },
        { provide: PropertyService, useValue: {} },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { reject: true, listing: { id: 'listing', title: 'Tin chờ duyệt' } },
        },
        { provide: MatDialogRef, useValue: ref },
      ],
    });
    const fixture = TestBed.createComponent(ListingEditorComponent);
    fixture.componentInstance.form.controls.reason.setValue('Nội dung chưa đầy đủ');
    fixture.componentInstance.save();
    expect(api.action).toHaveBeenCalledWith('listing', 'reject', 'Nội dung chưa đầy đủ');
    expect(ref.close).toHaveBeenCalledWith(true);
  });
  it('selects a property and sends propertyId instead of a representative room', () => {
    const api = { create: vi.fn(() => of({})) };
    const properties = {
      getAllMine: vi.fn(() =>
        of([
          { id: 'property-a', name: 'Cơ sở A', availableCount: 2, rentalMode: 'BY_ROOM' },
          { id: 'property-full', name: 'Hết phòng', availableCount: 0, rentalMode: 'BY_ROOM' },
        ]),
      ),
    };
    TestBed.configureTestingModule({
      imports: [ListingEditorComponent],
      providers: [
        { provide: ListingService, useValue: api },
        { provide: PropertyService, useValue: properties },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: { close: vi.fn(), disableClose: false } },
      ],
    });
    const component = TestBed.createComponent(ListingEditorComponent).componentInstance;
    expect(component.properties().map((property) => property.id)).toEqual(['property-a']);
    component.form.patchValue({
      propertyId: 'property-a',
      title: 'Cho thuê cơ sở A',
      description: 'Mô tả',
    });
    component.save();
    expect(api.create).toHaveBeenCalledWith({
      propertyId: 'property-a',
      title: 'Cho thuê cơ sở A',
      description: 'Mô tả',
    });
  });
});
