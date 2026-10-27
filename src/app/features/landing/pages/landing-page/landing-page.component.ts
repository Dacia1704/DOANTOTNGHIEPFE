import {
  ChangeDetectionStrategy,
  Component,
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
import { MatDialog } from '@angular/material/dialog';
import { RoomRentalStatus } from '@model/room/room.model';
import { PublicListingDetailComponent } from '../../../listing/components/public-listing-detail/public-listing-detail.component';
import { CategoryBarComponent } from '../../components/category-bar/category-bar.component';
import { SearchCapsuleComponent } from '../../components/search-capsule/search-capsule.component';
import { QuickFilterBarComponent } from '../../components/quick-filter-bar/quick-filter-bar.component';
import { RoomGridComponent } from '../../components/room-grid/room-grid.component';
import { LandlordCtaComponent } from '../../components/landlord-cta/landlord-cta.component';

/**
 * Trang landing page của tenant.
 * Cấu trúc:
 *  - Hero (badge + h1 + p + search capsule)
 *  - Quick filter bar
 *  - AI recommendation
 *  - Room grid (8 phòng)
 *  - Map finder
 *  - Landlord CTA
 */
@Component({
  selector: 'app-landing-page',
  imports: [
    CategoryBarComponent,
    SearchCapsuleComponent,
    QuickFilterBarComponent,
    RoomGridComponent,
    LandlordCtaComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements OnInit {
  private readonly listingService = inject(PublicListingService);
  private readonly destroy = inject(DestroyRef);
  private readonly requests = new Subject<{ page: number; append: boolean }>();
  private readonly dialog = inject(MatDialog);
  readonly rooms = signal<PublicListingList | null>(null);
  readonly searchError = signal('');
  readonly searching = signal(false);
  readonly activeQuery = signal<RoomQueryParams>({
    page: 0,
    size: 12,
    rentalStatus: RoomRentalStatus.AVAILABLE,
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

  openRoom(listing: PublicListing): void {
    this.listingService
      .getById(listing.listingId)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (current) =>
          this.dialog.open(PublicListingDetailComponent, {
            data: current,
            width: '1080px',
            maxWidth: 'calc(100vw - 32px)',
          }),
        error: (err) =>
          this.searchError.set(err.error?.message || 'Tin đăng đã ẩn hoặc không còn hiệu lực.'),
      });
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
