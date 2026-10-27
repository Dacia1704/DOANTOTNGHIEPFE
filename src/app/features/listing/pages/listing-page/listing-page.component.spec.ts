import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ListingPageComponent } from './listing-page.component';
import { ListingService } from '@services/listing.service';
import { Listing } from '@model/billing/billing.model';

describe('Admin manages posts rather than rooms', () => {
  it('loads every listing status, offers a filter and moderates pending posts only', () => {
    const records = ['PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED', 'EXPIRED'].map(
      (status) =>
        ({
          id: status,
          title: status,
          status,
          description: '',
          landlordId: 'owner',
          landlordName: 'Chủ trọ A',
          pendingExpiresAt: new Date('2080-01-01'),
          expiresAt: new Date('2080-01-01'),
          priorityLevel: 0,
        }) as Listing,
    );
    const api = {
      admin: vi.fn(() => of({ items: records, page: 0, totalPages: 1, total: 5 })),
      pending: vi.fn(),
      mine: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ListingService, useValue: api },
        { provide: MatDialog, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { admin: true } } } },
      ],
    });
    const fixture = TestBed.createComponent(ListingPageComponent);
    fixture.detectChanges();
    expect(api.admin).toHaveBeenCalledWith(0, undefined);
    expect(api.pending).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(5);
    const approve = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    expect(approve.filter((button) => button.textContent?.trim() === 'Duyệt tin').length).toBe(1);
    expect(approve.filter((button) => button.textContent?.trim() === 'Từ chối').length).toBe(1);
    fixture.componentInstance.statusFilter.set('HIDDEN');
    fixture.componentInstance.load(0);
    expect(api.admin).toHaveBeenLastCalledWith(0, 'HIDDEN');
  });
});
