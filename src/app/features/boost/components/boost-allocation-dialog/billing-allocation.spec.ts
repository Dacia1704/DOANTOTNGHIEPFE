import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BoostService } from '@services/boost.service';
import { ListingService } from '@services/listing.service';
import { ActiveBoost, Listing } from '@model/billing/billing.model';
import { BoostAllocationDialogComponent } from './boost-allocation-dialog.component';

describe('Billing Boost allocations', () => {
  function setup() {
    const group = {
      subscription: { id: 'owned', endAt: new Date(Date.now() + 86400000) },
      remainingHighPrioritySlots: 0,
      remainingLowPrioritySlots: 0,
      allocations: [{ listingId: 'listing', boostSubscriptionId: 'owned', level: 2 }],
    } as ActiveBoost;
    const listing = {
      id: 'listing',
      status: 'PUBLISHED',
      expiresAt: new Date(Date.now() + 86400000),
    } as Listing;
    const api = {
      active: vi.fn(() => of([group])),
      allocate: vi.fn(() => of(group.allocations[0])),
      release: vi.fn(() => of(null)),
    };
    const ref = { close: vi.fn(), disableClose: false };
    TestBed.configureTestingModule({
      imports: [BoostAllocationDialogComponent],
      providers: [
        { provide: BoostService, useValue: api },
        { provide: ListingService, useValue: { allMine: () => of([listing]) } },
        { provide: MAT_DIALOG_DATA, useValue: { listingId: 'listing' } },
        { provide: MatDialogRef, useValue: ref },
      ],
    });
    const fixture = TestBed.createComponent(BoostAllocationDialogComponent);
    return { fixture, component: fixture.componentInstance, api, ref, group };
  }
  it('prefills an existing allocation and permits idempotent save with zero free slots', () => {
    const { fixture, component, api } = setup();
    fixture.detectChanges();
    expect(component.form.getRawValue()).toEqual({
      listingId: 'listing',
      boostSubscriptionId: 'owned',
      level: 2,
    });
    expect(component.canUse(2)).toBe(true);
    expect(component.canUse(1)).toBe(false);
    component.save();
    expect(api.allocate).toHaveBeenCalledExactlyOnceWith('listing', {
      boostSubscriptionId: 'owned',
      level: 2,
    });
  });
  it('does not release the original allocation when a destination rejects a move', () => {
    const { component, api, group, ref } = setup();
    const destination = {
      ...group,
      subscription: { ...group.subscription, id: 'destination' },
      remainingLowPrioritySlots: 1,
      allocations: [],
    };
    component.groups.set([group, destination]);
    component.form.patchValue({ boostSubscriptionId: 'destination', level: 1 });
    api.allocate.mockReturnValue(
      throwError(() => ({ status: 409, error: { message: 'BOOST_SLOTS_EXCEEDED' } })),
    );
    component.save();
    expect(api.release).not.toHaveBeenCalled();
    expect(ref.close).not.toHaveBeenCalled();
    expect(component.existing()?.boostSubscriptionId).toBe('owned');
    expect(component.busy()).toBe(false);
    expect(component.error()).toContain('BOOST_SLOTS_EXCEEDED');
  });
  it('prevents assignment when the listing has expired since the dialog opened', () => {
    const { component, api } = setup();
    component.listings.set([{ ...component.listings()[0], expiresAt: new Date(Date.now() - 1) }]);
    component.save();
    expect(api.allocate).not.toHaveBeenCalled();
  });
});
