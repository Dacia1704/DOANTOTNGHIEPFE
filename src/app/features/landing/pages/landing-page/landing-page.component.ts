import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { PublicListingService } from '@services/public-listing.service';
import { PublicListing, PublicListingList } from '@model/public-listing/public-listing.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, map, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { RoomRentalStatus } from '@model/room/room.model';
import { SearchCapsuleComponent } from '../../components/search-capsule/search-capsule.component';
import { RoomGridComponent } from '../../components/room-grid/room-grid.component';
import { LandlordCtaComponent } from '../../components/landlord-cta/landlord-cta.component';

/**
 * Trang landing page của tenant.
 * Cấu trúc:
 *  - Hero (badge + h1 + p + search capsule)
 *  - One search form with a hierarchical room-type picker
 *  - Published listing results
 *  - Landlord CTA
 */
@Component({
  selector: 'app-landing-page',
  imports: [SearchCapsuleComponent, RoomGridComponent, LandlordCtaComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements OnInit {
  private readonly listingService = inject(PublicListingService);
  private readonly destroy = inject(DestroyRef);
  private readonly requests = new Subject<{ page: number; append: boolean }>();
  private readonly router = inject(Router);
  readonly rooms = signal<PublicListingList | null>(null);
  readonly searchError = signal('');
  readonly searching = signal(false);
  readonly locationLabels = signal({ province: '', ward: '' });
  readonly activeQuery = signal<RoomQueryParams>({
    page: 0,
    size: 12,
    rentalStatus: RoomRentalStatus.AVAILABLE,
  });
  readonly filterChips = computed(() => {
    const query = this.activeQuery();
    const chips: { key: string; label: string }[] = [];
    if (query.provinceId)
      chips.push({
        key: 'province',
        label: this.locationLabels().province || 'Tỉnh / thành phố đã chọn',
      });
    if (query.wardId)
      chips.push({ key: 'ward', label: this.locationLabels().ward || 'Phường / xã đã chọn' });
    if (query.roomTypeName) chips.push({ key: 'type', label: query.roomTypeName });
    if (query.minPrice != null || query.maxPrice != null) {
      const format = (value: number) => new Intl.NumberFormat('vi-VN').format(value / 1000000);
      const label =
        query.minPrice == null
          ? `Dưới ${format(query.maxPrice!)} triệu`
          : query.maxPrice == null
            ? `Trên ${format(query.minPrice)} triệu`
            : `${format(query.minPrice)} – ${format(query.maxPrice)} triệu`;
      chips.push({ key: 'price', label });
    }
    for (const name of query.amenityNames ?? [])
      chips.push({ key: `amenity:${name}`, label: name });
    return chips;
  });

  ngOnInit(): void {
    this.requests
      .pipe(
        switchMap(({ page, append }) => {
          this.searching.set(true);
          this.searchError.set('');
          if (!append) this.rooms.set(null);
          return this.listingService.search({ ...this.activeQuery(), page }).pipe(
            map((result) => ({ result, append })),
            catchError((err) => {
              this.searchError.set(
                err?.error?.message || 'Không tải được tin đăng. Vui lòng thử lại.',
              );
              return EMPTY;
            }),
            finalize(() => this.searching.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(({ result, append }) => {
        this.rooms.set(
          append ? { ...result, items: [...(this.rooms()?.items ?? []), ...result.items] } : result,
        );
      });
    this.loadRooms();
  }

  searchRooms(query: RoomQueryParams): void {
    this.activeQuery.update((current) => ({
      ...current,
      ...query,
      page: 0,
      size: current.size ?? 12,
    }));
    this.loadRooms();
  }

  updateFilters(filters: RoomQueryParams): void {
    this.activeQuery.update((current) => ({ ...current, ...filters, page: 0 }));
    this.loadRooms();
  }

  selectRoomType(roomTypeName: string): void {
    this.updateFilters({ roomTypeName });
  }

  removeFilter(key: string): void {
    switch (key) {
      case 'province':
        this.updateFilters({ provinceId: undefined, wardId: undefined });
        break;
      case 'ward':
        this.updateFilters({ wardId: undefined });
        break;
      case 'type':
        this.updateFilters({ roomTypeName: undefined });
        break;
      case 'price':
        this.updateFilters({ minPrice: undefined, maxPrice: undefined });
        break;
      default:
        this.updateFilters({
          amenityNames: (this.activeQuery().amenityNames ?? []).filter(
            (name) => `amenity:${name}` !== key,
          ),
        });
    }
  }

  resetFilters(): void {
    this.activeQuery.set({ page: 0, size: 12, rentalStatus: RoomRentalStatus.AVAILABLE });
    this.loadRooms();
  }

  openRoom(listing: PublicListing): void {
    void this.router.navigate(['/tro', listing.listingId]);
  }
  loadMore(): void {
    const current = this.rooms();
    if (!current || current.page + 1 >= current.totalPages || this.searching()) return;
    this.requests.next({ page: current.page + 1, append: true });
  }
  private loadRooms(): void {
    this.requests.next({ page: 0, append: false });
  }
}
