import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { RoomService } from '@core/services/room.service';
import { MatDialog } from '@angular/material/dialog';
import { Room, RoomListResult, RoomRentalStatus } from '@model/room/room.model';
import { RoomDetailDialogComponent } from '../../../room/components/room-detail-dialog/room-detail-dialog.component';
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
  private readonly roomService = inject(RoomService);
  private readonly dialog = inject(MatDialog);
  readonly rooms = signal<RoomListResult | null>(null);
  readonly searchError = signal('');
  readonly searching = signal(false);
  readonly activeQuery = signal<RoomQueryParams>({ page: 0, size: 12, rentalStatus: RoomRentalStatus.AVAILABLE });

  ngOnInit(): void {
    this.loadRooms();
  }

  searchRooms(query: RoomQueryParams): void {
    this.activeQuery.update(current => ({ ...current, ...query, page: 0, size: current.size ?? 12 }));
    this.loadRooms();
  }

  updateFilters(filters: RoomQueryParams): void {
    this.activeQuery.update(current => ({ ...current, ...filters, page: 0 }));
    this.loadRooms();
  }

  selectRoomType(roomTypeName: string): void {
    this.updateFilters({ roomTypeName });
  }

  openRoom(room: Room): void {
    this.dialog.open(RoomDetailDialogComponent, {
      data: { room },
      width: '760px',
      maxWidth: 'calc(100vw - 32px)',
    });
  }

  loadMore(): void {
    const current = this.rooms();
    if (!current || current.page + 1 >= current.totalPages || this.searching()) return;
    const page = current.page + 1;
    this.searching.set(true);
    this.roomService.filterRooms({ ...this.activeQuery(), page }).subscribe({
      next: result => {
        this.rooms.set({ ...result, items: [...current.items, ...result.items] });
        this.searching.set(false);
      },
      error: err => {
        this.searchError.set(err?.error?.message || 'Không thể tải thêm phòng. Vui lòng thử lại.');
        this.searching.set(false);
      },
    });
  }

  private loadRooms(): void {
    this.searching.set(true);
    this.searchError.set('');
    this.rooms.set(null);
    this.roomService.filterRooms(this.activeQuery()).subscribe({
      next: result => { this.rooms.set(result); this.searching.set(false); },
      error: err => {
        this.searching.set(false);
        this.searchError.set(err?.error?.message || 'Không thể tải danh sách phòng. Vui lòng thử lại.');
      },
    });
  }
}
