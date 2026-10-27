import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { RoomTypeService } from '@services/room-type.service';
import { RoomType, RoomTypeList } from '@model/room-type/room-type.model';
import { RoomTypeTreeComponent } from '@shared/components/room-type-tree/room-type-tree.component';
import { RoomTypeActionDialogComponent } from './room-type-action-dialog/room-type-action-dialog.component';

@Component({
  selector: 'app-room-type-management',
  imports: [ReactiveFormsModule, RoomTypeTreeComponent],
  templateUrl: './room-type-management.component.html',
  styleUrl: './room-type-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomTypeManagementComponent {
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  readonly searchControl = inject(FormBuilder).nonNullable.control('');

  readonly result = signal<RoomTypeList | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    this.roomTypeService
      .getAllRoomTypes()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (items) => this.result.set({ items, page: 0, totalPages: 1, total: items.length }),
        error: (err: { status?: number; error?: { message?: string } }) => {
          this.error.set(
            err.status === 403
              ? 'Bạn không có quyền xem danh sách loại phòng.'
              : err.error?.message || 'Không thể tải danh sách loại phòng. Vui lòng thử lại sau.',
          );
        },
      });
  }

  openCreate(parent?: RoomType): void {
    this.success.set('');
    this.dialog
      .open(RoomTypeActionDialogComponent, {
        data: {
          action: 'create',
          parentId: parent?.id,
          existingTypes: this.result()?.items ?? [],
        },
        width: '560px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (!changed) return;
        this.success.set('Tạo loại phòng mới thành công.');
        this.load();
      });
  }

  openEdit(roomType: RoomType): void {
    this.success.set('');
    this.dialog
      .open(RoomTypeActionDialogComponent, {
        data: {
          roomType,
          action: 'edit',
          existingTypes: this.result()?.items ?? [],
        },
        width: '560px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (!changed) return;
        this.success.set('Cập nhật loại phòng thành công.');
        this.load();
      });
  }

  openDelete(roomType: RoomType): void {
    this.success.set('');
    this.dialog
      .open(RoomTypeActionDialogComponent, {
        data: {
          roomType,
          action: 'delete',
          existingTypes: [],
        },
        width: '480px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (!changed) return;
        this.success.set('Đã xóa loại phòng.');
        this.load();
      });
  }
}
