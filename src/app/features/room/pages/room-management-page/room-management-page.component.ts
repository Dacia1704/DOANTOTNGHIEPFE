import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { RoomService } from '@services/room.service';
import { AuthService } from '@services/auth.service';
import { Room, RoomListResult, RoomRentalStatus, ROOM_STATUS_LABELS } from '@model/room/room.model';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { RoleCode } from '@model/auth/auth.model';
import { RoomUtils } from '@shared/utils/room-utils';
import { TextUtils } from '@shared/utils/text-utils';
import { ImageUtils } from '@shared/utils/image-utils';

import { RoomCardComponent } from '../../components/room-card/room-card.component';
import { RoomFilterComponent } from '../../components/room-filter/room-filter.component';
import { RoomFormDialogComponent } from '../../components/room-form-dialog/room-form-dialog.component';
import { RoomImageDialogComponent } from '../../components/room-image-dialog/room-image-dialog.component';
import { RoomDetailDialogComponent } from '../../components/room-detail-dialog/room-detail-dialog.component';
import { RoomDeleteDialogComponent } from '../../components/room-delete-dialog/room-delete-dialog.component';

@Component({
  selector: 'app-room-management-page',
  imports: [RoomCardComponent, RoomFilterComponent, RouterLink],
  templateUrl: './room-management-page.component.html',
  styleUrl: './room-management-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomManagementPageComponent implements OnInit {
  private readonly roomService = inject(RoomService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly roomUtils = RoomUtils;
  readonly textUtils = TextUtils;
  readonly imageUtils = ImageUtils;
  readonly statusLabels = ROOM_STATUS_LABELS;

  readonly isLandlord = signal(this.auth.primaryRole() === RoleCode.LANDLORD);
  readonly isAdmin = signal(this.auth.primaryRole() === RoleCode.ADMIN);

  // Active view: grid cards or table
  readonly viewMode = signal<'grid' | 'table'>('grid');

  readonly result = signal<RoomListResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  // Active filter params
  private activeParams: RoomQueryParams = { page: 0, size: 12 };

  // Quick stats
  readonly stats = signal({
    total: 0,
    available: 0,
    rented: 0,
    maintenance: 0,
  });

  ngOnInit(): void {
    this.load(0);
  }

  setViewMode(mode: 'grid' | 'table'): void {
    this.viewMode.set(mode);
  }

  onFilterChange(params: RoomQueryParams): void {
    this.activeParams = { ...this.activeParams, ...params, page: 0 };
    this.load(0);
  }

  load(page = this.result()?.page ?? 0): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    this.activeParams.page = page;

    // Landlord fetches my rooms or search
    const request$ = this.isLandlord()
      ? this.roomService.getMyRooms(page, this.activeParams.size ?? 12)
      : this.roomService.getRooms(this.activeParams);

    request$.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: res => {
        this.result.set(res);
        this.computeStats(res.items);
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.error.set(
          err.status === 403
            ? 'Bạn không có quyền truy cập danh sách phòng.'
            : err.error?.message || 'Không thể tải danh sách phòng. Vui lòng thử lại sau.',
        );
      },
    });
  }

  private computeStats(rooms: Room[]): void {
    let available = 0;
    let rented = 0;
    let maintenance = 0;

    for (const r of rooms) {
      if (r.rentalStatus === RoomRentalStatus.AVAILABLE) available++;
      else if (r.rentalStatus === RoomRentalStatus.RENTED) rented++;
      else if (r.rentalStatus === RoomRentalStatus.MAINTENANCE) maintenance++;
    }

    this.stats.set({
      total: this.result()?.total ?? rooms.length,
      available,
      rented,
      maintenance,
    });
  }

  openCreate(): void {
    this.success.set('');
    this.dialog.open(RoomFormDialogComponent, {
      data: { action: 'create' },
      width: '780px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.success.set('Thêm phòng mới thành công!');
      this.load(0);
    });
  }

  openEdit(room: Room): void {
    this.success.set('');
    this.dialog.open(RoomFormDialogComponent, {
      data: { room, action: 'edit' },
      width: '780px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.success.set('Cập nhật phòng thành công.');
      this.load();
    });
  }

  openManageImages(room: Room): void {
    this.success.set('');
    this.dialog.open(RoomImageDialogComponent, {
      data: { room },
      width: '720px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.load();
    });
  }

  openDetail(room: Room): void {
    this.dialog.open(RoomDetailDialogComponent, {
      data: { room },
      width: '720px',
      maxWidth: 'calc(100vw - 32px)',
    });
  }

  openDelete(room: Room): void {
    this.success.set('');
    this.dialog.open(RoomDeleteDialogComponent, {
      data: { room },
      width: '480px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.success.set('Đã xóa phòng.');
      const current = this.result();
      const page = current?.page ?? 0;
      this.load(current?.items.length === 1 && page > 0 ? page - 1 : page);
    });
  }
}
