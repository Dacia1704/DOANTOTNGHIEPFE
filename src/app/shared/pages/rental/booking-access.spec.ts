import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ListingDetailPageComponent } from '../../../features/tenant/listing/pages/listing-detail-page/listing-detail-page.component';
import { AuthService } from '@services/auth/auth.service';
import { ChatWidgetService } from '@services/chat/chat-widget.service';
import { PublicListingService } from '@services/listing/public-listing.service';
import { PublicListing } from '@model/public-listing/public-listing.model';
import { Room } from '@model/room/room.model';
import { RoleCode } from '@model/auth/auth.model';

describe('listing booking access', () => {
  const auth = { session: () => ({ id: 'tenant' }), isLoggedIn: vi.fn(), hasAnyRole: vi.fn() };
  const open = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    auth.isLoggedIn.mockReturnValue(true);
    auth.hasAnyRole.mockReturnValue(true);
    open.mockReturnValue({ afterClosed: () => of('refresh') });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: MatDialog, useValue: { open } },
        { provide: ChatWidgetService, useValue: {} },
        { provide: PublicListingService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'post' } } } },
      ],
    });
  });
  function component(availability: 'AVAILABLE' | 'HELD' = 'AVAILABLE', landlord = 'owner') {
    const c = TestBed.createComponent(ListingDetailPageComponent).componentInstance;
    c.listing.set({ id: 'post', property: { rooms: [] } } as unknown as PublicListing);
    c.selectedRoom.set({
      id: 'room',
      bookingAvailability: availability,
      landlordId: landlord,
    } as Room);
    return c;
  }
  it('disallows held rooms even if physical rental status is available', () => {
    const c = component('HELD');
    c.book();
    expect(open).not.toHaveBeenCalled();
  });
  it('disallows the property owner and non-tenant roles', () => {
    component('AVAILABLE', 'tenant').book();
    expect(open).not.toHaveBeenCalled();
    auth.hasAnyRole.mockReturnValue(false);
    component().book();
    expect(open).not.toHaveBeenCalled();
  });
  it('routes anonymous visitors to login before opening the form', () => {
    auth.isLoggedIn.mockReturnValue(false);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component().book();
    expect(nav).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: TestBed.inject(Router).url },
    });
    expect(open).not.toHaveBeenCalled();
  });
  it('navigates an eligible tenant to the selected room booking page', () => {
    const c = component();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    c.book();
    expect(nav).toHaveBeenCalledWith(['/tro', 'post', 'dat-phong', 'room']);
    expect(open).not.toHaveBeenCalled();
    expect(auth.hasAnyRole).toHaveBeenCalledWith([RoleCode.TENANT]);
  });
  it('passes the current listing context when reporting the landlord', () => {
    const c = component();
    c.report('LANDLORD');
    expect(open.mock.calls[0][1].data).toMatchObject({
      targetType: 'LANDLORD', targetId: 'owner', originListingId: 'post',
    });
  });
});
