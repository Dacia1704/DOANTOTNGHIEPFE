import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { vi } from 'vitest';
import { PublicListingDetailComponent } from './public-listing-detail.component';
import { RoomDetailDialogComponent } from '../../../room/components/room-detail-dialog/room-detail-dialog.component';
import { RoomGridComponent } from '../../../landing/components/room-grid/room-grid.component';
import { PublicListingMapper } from '@model/public-listing/public-listing.mapper';
import { PublicListingResponse } from '@model/public-listing/response/public-listing-response';
import { RoomRentalStatus } from '@model/room/room.model';

function listing(mode: 'WHOLE' | 'BY_ROOM') {
  const room = {
    id: 'r1',
    propertyId: 'p1',
    roomNumber: 'A101',
    floorNumber: 1,
    landlordId: 'owner',
    roomTypeId: 'rt',
    roomTypeName: 'Studio',
    price: mode === 'WHOLE' ? 12000000 : 3000000,
    areaM2: mode === 'WHOLE' ? 100 : 25,
    maxOccupants: 2,
    electricityPrice: null,
    waterPrice: null,
    serviceFee: null,
    defaultDeposit: 0,
    provinceId: 'p',
    provinceName: 'Hà Nội',
    wardId: 'w',
    wardName: 'Phường A',
    addressLine: '123 Test',
    latitude: null,
    longitude: null,
    rentalStatus: RoomRentalStatus.AVAILABLE,
    amenities: [],
    images: [],
  };
  const dto: PublicListingResponse = {
    id: 'post1',
    propertyId: 'p1',
    title: 'Bài đăng cơ sở A',
    description: 'Mô tả cơ sở',
    status: 'PUBLISHED',
    publishedAt: '2026-10-27T10:00:00',
    expiresAt: '2080-10-27T10:00:00',
    priorityLevel: 0,
    propertyName: 'Cơ sở A',
    rentalMode: mode,
    property: {
      id: 'p1',
      landlordId: 'owner',
      name: 'Cơ sở A',
      propertyTypeId: 'pt',
      propertyTypeName: mode === 'WHOLE' ? 'Nhà riêng' : 'Nhà trọ',
      rentalMode: mode,
      totalFloors: 2,
      provinceId: 'p',
      provinceName: 'Hà Nội',
      wardId: 'w',
      wardName: 'Phường A',
      addressLine: '123 Test',
      latitude: null,
      longitude: null,
      amenities: [],
      images: [],
      rooms:
        mode === 'WHOLE'
          ? [room]
          : [room, { ...room, id: 'r2', roomNumber: 'A102', price: 4500000, floorNumber: 2 }],
    },
  };
  return PublicListingMapper.fromResponse(dto);
}

describe('One listing per property with room-level details', () => {
  it('renders one public card for a property containing multiple rooms', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(RoomGridComponent);
    const post = listing('BY_ROOM');
    fixture.componentInstance.result = { items: [post], page: 0, total: 1, totalPages: 1 };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-room-card').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Từ 3.000.000');
    expect(post.property.rooms.length).toBe(2);
    expect(post.extraLabel).toBe('2 phòng trống');
  });
  it('allows opening each room from a read-only property listing without management controls', async () => {
    const post = listing('BY_ROOM');
    const dialogs = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: post },
        { provide: MatDialog, useValue: dialogs },
      ],
    });
    TestBed.overrideComponent(PublicListingDetailComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialogs }] },
    });
    const fixture = TestBed.createComponent(PublicListingDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    expect(buttons.some((button) => button.textContent?.includes('Thêm phòng'))).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.room-name').length).toBe(2);
    expect(fixture.debugElement.injector.get(MatDialog)).toBe(dialogs);
    const opened = vi.spyOn(fixture.componentInstance, 'openRoom');
    fixture.debugElement.queryAll(By.css('.room-name'))[1].triggerEventHandler('click');
    expect(opened).toHaveBeenCalled();
    await fixture.whenStable();
    expect(dialogs.open).toHaveBeenCalledWith(
      RoomDetailDialogComponent,
      expect.objectContaining({
        data: { room: expect.objectContaining({ id: 'r2', price: 4500000, floorNumber: 2 }) },
      }),
    );
    expect(fixture.nativeElement.querySelector('button[title="Sửa phòng"]')).toBeNull();
  });
  it('shows whole-house information without displaying a room list or a from-price', () => {
    const post = listing('WHOLE');
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: post },
        { provide: MatDialog, useValue: { open: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(PublicListingDetailComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.whole-house')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(post.property.rooms.length).toBe(1);
    expect(post.price).toBe(12000000);
    expect(post.categoryLabel).toBe('Cho thuê nguyên căn');
  });
});
