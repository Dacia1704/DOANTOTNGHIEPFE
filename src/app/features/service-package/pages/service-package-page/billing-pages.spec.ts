import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ServicePackageService } from '@services/service-package.service';
import { SubscriptionService } from '@services/subscription.service';
import { BoostService } from '@services/boost.service';
import { ListingService } from '@services/listing.service';
import { ServicePackagePageComponent } from './service-package-page.component';
import { BoostPageComponent } from '../../../boost/pages/boost-page/boost-page.component';
import { ActiveBoost, BoostPackage, SubscriptionOrder } from '@model/billing/billing.model';

registerLocaleData(localeVi);
describe('Billing purchase screens', () => {
  function packagePage(expired = false, scheduled = false) {
    const rights = {
      packageCode: 'PAID',
      packageName: 'Gói hiện tại',
      maxListings: 10,
      highPrioritySlots: 2,
      lowPrioritySlots: 3,
      defaultPriorityLevel: 0,
      hasStats: false,
    };
    const packages = {
      all: () =>
        of([
          { ...rights, id: 'paid', code: 'PAID', name: 'Gói trả phí', active: true },
          { ...rights, id: 'free', code: 'FREE', name: 'Free', active: true },
        ]),
      prices: vi.fn(() =>
        of([{ id: 'price', packageId: 'paid', durationMonths: 1, price: 100000, active: true }]),
      ),
    };
    const subscriptions = {
      current: () =>
        of({
          free: false,
          canSubmitListings: !expired,
          rights,
          subscriptionEndsAt: new Date(),
          currentPeriod: null,
          nextPeriod: null,
          scheduledChange: null,
        }),
      allOrders: () =>
        of(
          scheduled
            ? [
                {
                  type: 'CHANGE',
                  status: 'SCHEDULED',
                  rights,
                  effectiveAt: new Date(),
                  endAt: new Date(),
                },
              ]
            : [],
        ),
      orders: () => of({ items: [], page: 0, totalPages: 0, total: 0 }),
      create: vi.fn(() => of({ id: 'order' })),
    };
    TestBed.configureTestingModule({
      imports: [ServicePackagePageComponent],
      providers: [
        provideRouter([]),
        { provide: ServicePackageService, useValue: packages },
        { provide: SubscriptionService, useValue: subscriptions },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ServicePackagePageComponent);
    return { fixture, page: fixture.componentInstance, packages, subscriptions };
  }
  it('renders an expired paid subscription distinctly and offers PURCHASE', () => {
    const { fixture, page } = packagePage(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Gói đã hết hạn');
    expect(page.current()?.free).toBe(false);
    expect(page.type(page.packages()[0])).toBe('PURCHASE');
  });
  it('does not request paid pricing or show a purchase button for Free', () => {
    const { fixture, packages } = packagePage();
    fixture.detectChanges();
    expect(packages.prices).toHaveBeenCalledTimes(1);
    const cards = Array.from(fixture.nativeElement.querySelectorAll('.card')) as HTMLElement[];
    expect(
      cards.find((card) => card.textContent?.includes('Free'))?.querySelector('button'),
    ).toBeNull();
  });
  it('blocks new purchase and renewal when a change has already been scheduled', () => {
    const { page, subscriptions } = packagePage(false, true);
    page.choose(page.packages()[0]);
    expect(subscriptions.create).not.toHaveBeenCalled();
  });
  it('prevents duplicate orders while creation is in flight', () => {
    const { page, subscriptions } = packagePage();
    const pending = new Subject<{ id: string }>();
    subscriptions.create.mockReturnValue(pending);
    page.choose(page.packages()[0]);
    page.choose(page.packages()[0]);
    expect(subscriptions.create).toHaveBeenCalledTimes(1);
    expect(page.busy()).toBe(true);
    pending.next({ id: 'order' });
    pending.complete();
    expect(page.busy()).toBe(false);
  });
  it('refreshes rights instead of navigating to checkout for a zero-charge APPLIED upgrade', () => {
    const { fixture, page, subscriptions } = packagePage();
    const target = { ...page.packages()[0], id: 'upgrade', code: 'UPGRADE' };
    subscriptions.create.mockReturnValue(
      of({
        id: 'zero-charge',
        type: 'CHANGE',
        status: 'APPLIED',
        price: 0,
        immediateUpgrade: true,
        rights: { packageName: 'Gói nâng cấp' },
      }),
    );
    const refresh = vi.spyOn(subscriptions, 'current');
    page.choose(target);
    fixture.detectChanges();
    expect(subscriptions.create).toHaveBeenCalledExactlyOnceWith({
      priceOptionId: 'price',
      type: 'CHANGE',
    });
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(page.expanded()).toBe('zero-charge');
    expect(fixture.nativeElement.textContent).toContain('Không phát sinh khoản thanh toán VNPay');
  });
  it('allows buying Boost without listings and without selecting any listing', () => {
    const pkg = {
      id: 'catalog',
      name: 'Gói Boost',
      highPrioritySlots: 3,
      lowPrioritySlots: 5,
      durationMonths: 3,
      price: 150000,
    } as BoostPackage;
    const api = {
      active: () => of([] as ActiveBoost[]),
      packages: () => of([pkg]),
      create: vi.fn(() => of({ id: 'boost-order' })),
    };
    TestBed.configureTestingModule({
      imports: [BoostPageComponent],
      providers: [
        provideRouter([]),
        { provide: BoostService, useValue: api },
        { provide: ListingService, useValue: { allMine: () => throwError(() => ({ status: 0 })) } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
      ],
    });
    const navigation = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(BoostPageComponent);
    const page = fixture.componentInstance;
    page.switchTab('catalog');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('3 suất ưu tiên cao');
    expect(fixture.nativeElement.textContent).toContain('5 suất ưu tiên thấp');
    page.buy(pkg);
    expect(api.create).toHaveBeenCalledExactlyOnceWith({ boostPackageId: 'catalog' });
    expect(navigation).toHaveBeenCalledWith(['/thanh-toan/xac-nhan/BOOST_PACKAGE', 'boost-order']);
  });
});
