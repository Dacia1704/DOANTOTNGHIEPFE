import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { RoomTypeService } from '@services/room-type.service';
import { RoomType, RoomTypeCategory, RoomTypeList } from '@model/room-type/room-type.model';
import { TextUtils } from '@shared/utils/text-utils';
import { RoomUtils } from '@shared/utils/room-utils';
import { RoomTypeActionDialogComponent } from './room-type-action-dialog/room-type-action-dialog.component';

@Component({
  selector: 'app-room-type-management',
  imports: [ReactiveFormsModule],
  templateUrl: './room-type-management.component.html',
  styleUrl: './room-type-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomTypeManagementComponent {
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  readonly textUtils = TextUtils;
  readonly roomUtils = RoomUtils;

  readonly activeTab = signal<'list' | 'categories'>('list');
  readonly searchControl = inject(FormBuilder).nonNullable.control('');

  readonly result = signal<RoomTypeList | null>(null);
  readonly categories = signal<RoomTypeCategory[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  constructor() {
    this.load(0);
  }

  setTab(tab: 'list' | 'categories'): void {
    this.activeTab.set(tab);
    if (tab === 'categories' && this.categories().length === 0) {
      this.loadCategories();
    }
  }

  load(page = this.result()?.page ?? 0): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    this.roomTypeService.getRoomTypes(page, 10).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: res => this.result.set(res),
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.error.set(
          err.status === 403
            ? 'Bạn không có quyền xem danh sách loại phòng.'
            : err.error?.message || 'Không thể tải danh sách loại phòng. Vui lòng thử lại sau.',
        );
      },
    });
  }

  loadCategories(): void {
    this.loading.set(true);
    this.roomTypeService.getCategoriesWithRooms().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: cats => this.categories.set(cats),
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.error.set(err.error?.message || 'Không thể tải danh mục phòng.');
      },
    });
  }

  openCreate(): void {
    this.success.set('');
    this.dialog.open(RoomTypeActionDialogComponent, {
      data: {
        action: 'create',
        existingTypes: this.result()?.items ?? [],
      },
      width: '560px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.success.set('Tạo loại phòng mới thành công.');
      this.load(0);
      if (this.activeTab() === 'categories') this.loadCategories();
    });
  }

  openEdit(roomType: RoomType): void {
    this.success.set('');
    this.dialog.open(RoomTypeActionDialogComponent, {
      data: {
        roomType,
        action: 'edit',
        existingTypes: this.result()?.items ?? [],
      },
      width: '560px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.success.set('Cập nhật loại phòng thành công.');
      this.load();
      if (this.activeTab() === 'categories') this.loadCategories();
    });
  }

  openDelete(roomType: RoomType): void {
    this.success.set('');
    this.dialog.open(RoomTypeActionDialogComponent, {
      data: {
        roomType,
        action: 'delete',
        existingTypes: [],
      },
      width: '480px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.success.set('Đã xóa loại phòng.');
      const current = this.result();
      const page = current?.page ?? 0;
      this.load(current?.items.length === 1 && page > 0 ? page - 1 : page);
      if (this.activeTab() === 'categories') this.loadCategories();
    });
  }

  filteredItems(): RoomType[] {
    const list = this.result()?.items ?? [];
    const term = this.searchControl.value.trim().toLowerCase();
    if (!term) return list;
    return list.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term),
    );
  }
}
