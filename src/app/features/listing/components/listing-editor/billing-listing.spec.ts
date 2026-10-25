import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ListingService } from '@services/listing.service';
import { RoomService } from '@services/room.service';
import { ListingEditorComponent } from './listing-editor.component';

describe('Billing listing prerequisites', () => {
  it('allows admin rejection with only a reason, without requiring room or new title', () => {
    const api = { action: vi.fn(() => of({})) };
    const ref = { close: vi.fn(), disableClose: false };
    TestBed.configureTestingModule({
      imports: [ListingEditorComponent],
      providers: [
        { provide: ListingService, useValue: api },
        { provide: RoomService, useValue: {} },
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
});
