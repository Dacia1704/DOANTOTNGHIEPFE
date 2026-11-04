import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ListingService } from '@services/listing/listing.service';
import { PropertyService } from '@services/property/property.service';
import { ListingEditorComponent } from './listing-editor.component';
import { BoostService } from '@services/subscription/boost.service';
import { SubscriptionService } from '@services/subscription/subscription.service';
import { provideRouter } from '@angular/router';
import { ActiveBoost } from '@model/billing/billing.model';

describe('Billing listing prerequisites', () => {
  const boost = {
    subscription: {
      id: 'boost-owned',
      packageNameSnapshot: 'Boost 1 tháng',
      endAt: new Date(Date.now() + 86400000),
    },
    remainingHighPrioritySlots: 1,
    remainingLowPrioritySlots: 3,
    allocations: [],
  } as unknown as ActiveBoost;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: BoostService, useValue: { active: () => of([boost]) } },
        {
          provide: SubscriptionService,
          useValue: {
            current: () =>
              of({
                canSubmitListings: true,
                rights: {
                  packageName: 'Gói 1',
                  highPrioritySlots: 2,
                  lowPrioritySlots: 5,
                  defaultPriorityLevel: 0,
                },
              }),
          },
        },
      ],
    });
  });
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
      priorityLevel: 2,
    });
    component.save();
    expect(api.create).toHaveBeenCalledWith({
      propertyId: 'property-a',
      title: 'Cho thuê cơ sở A',
      description: 'Mô tả',
      priorityLevel: 2,
    });
  });
  it('keeps the form open and reports the server error when posting credits are exhausted', () => {
    const api = {
      create: vi.fn(() =>
        throwError(() => ({ status: 400, error: { message: 'Đã hết lượt đăng tin' } })),
      ),
    };
    const ref = { close: vi.fn(), disableClose: false };
    TestBed.configureTestingModule({
      imports: [ListingEditorComponent],
      providers: [
        { provide: ListingService, useValue: api },
        {
          provide: PropertyService,
          useValue: { getAllMine: () => of([{ id: 'p', availableCount: 1 }]) },
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: ref },
      ],
    });
    const fixture = TestBed.createComponent(ListingEditorComponent);
    fixture.componentInstance.form.patchValue({ propertyId: 'p', title: 'Valid title' });
    fixture.componentInstance.save();
    fixture.detectChanges();
    expect(ref.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Đã hết lượt đăng tin');
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Chỉ hoàn khi admin từ chối');
  });

  it.each([true, false])(
    'uses the server first-review flag (%s) for the admin refund notice',
    (initialReview) => {
      TestBed.configureTestingModule({
        imports: [ListingEditorComponent],
        providers: [
          { provide: ListingService, useValue: {} },
          { provide: PropertyService, useValue: {} },
          {
            provide: MAT_DIALOG_DATA,
            useValue: {
              reject: true,
              listing: {
                id: 'pending',
                title: 'Tin chưa xuất bản',
                publishedAt: null,
                initialReview,
              },
            },
          },
          { provide: MatDialogRef, useValue: { close: vi.fn(), disableClose: false } },
        ],
      });
      const fixture = TestBed.createComponent(ListingEditorComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(
        initialReview ? 'hoàn đúng lượt đăng' : 'không hoàn lượt đăng',
      );
    },
  );

  function setupCreate() {
    const api = { create: vi.fn(() => of({})) };
    const ref = { close: vi.fn(), disableClose: false };
    TestBed.configureTestingModule({
      imports: [ListingEditorComponent],
      providers: [
        { provide: ListingService, useValue: api },
        {
          provide: PropertyService,
          useValue: { getAllMine: () => of([{ id: 'p', availableCount: 1 }]) },
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: ref },
      ],
    });
    const fixture = TestBed.createComponent(ListingEditorComponent);
    fixture.componentInstance.form.patchValue({ propertyId: 'p', title: 'Cho thuê phòng' });
    return { fixture, component: fixture.componentInstance, api, ref };
  }

  it('shows remaining Boost credits and submits the Boost choice in the same create request', () => {
    const { fixture, component, api } = setupCreate();
    component.form.patchValue({
      prioritySource: 'boost',
      boostSubscriptionId: 'boost-owned',
      boostPriorityLevel: 2,
      priorityLevel: 1,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Boost 1 tháng');
    expect(fixture.nativeElement.textContent).toContain('còn 1 cao / 3 thấp');
    expect(fixture.nativeElement.textContent).toContain('Sau khi đăng: còn 0 lượt');
    component.save();
    expect(api.create).toHaveBeenCalledExactlyOnceWith({
      propertyId: 'p',
      title: 'Cho thuê phòng',
      description: '',
      priorityLevel: 0,
      boostSubscriptionId: 'boost-owned',
      boostPriorityLevel: 2,
    });
  });

  it('blocks an exhausted or expired Boost and retains input for another choice', () => {
    const { component, api } = setupCreate();
    component.form.patchValue({
      prioritySource: 'boost',
      boostSubscriptionId: 'boost-owned',
      boostPriorityLevel: 2,
    });
    component.boosts.set([{ ...boost, remainingHighPrioritySlots: 0 }]);
    component.save();
    expect(api.create).not.toHaveBeenCalled();
    expect(component.error()).toContain('còn lượt');
    expect(component.form.controls.title.value).toBe('Cho thuê phòng');
    component.boosts.set([
      { ...boost, subscription: { ...boost.subscription, endAt: new Date(Date.now() - 1) } },
    ]);
    component.save();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('switches to available low Boost credits and omits Boost fields after switching to service priority', () => {
    const { component, api } = setupCreate();
    component.boosts.set([{ ...boost, remainingHighPrioritySlots: 0 }]);
    component.form.patchValue({ prioritySource: 'boost', boostSubscriptionId: 'boost-owned' });
    component.selectBoost();
    expect(component.form.controls.boostPriorityLevel.value).toBe(1);
    component.form.patchValue({ prioritySource: 'package', priorityLevel: 2 });
    component.save();
    expect(api.create).toHaveBeenCalledExactlyOnceWith({
      propertyId: 'p',
      title: 'Cho thuê phòng',
      description: '',
      priorityLevel: 2,
    });
  });
});
