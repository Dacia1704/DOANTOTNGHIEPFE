import { computed } from '@angular/core';
import {
  ManagementTableComponent,
  ManagementTableColumn,
} from '@shared/components/management-table/management-table.component';
import { ManagementTableCellDirective } from '@shared/components/management-table/management-table-cell.directive';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AmenityService } from '@services/room/amenity.service';
import { Amenity, AmenityList } from '@model/amenity/amenity.model';
import { TextUtils } from '@shared/utils/text-utils';
import { AmenityActionDialogComponent } from './amenity-action-dialog/amenity-action-dialog.component';

@Component({
  selector: 'app-amenity-management',
  imports: [ReactiveFormsModule, ManagementTableComponent, ManagementTableCellDirective],
  templateUrl: './amenity-management.component.html',
  styleUrl: './amenity-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmenityManagementComponent {
  readonly pageSize = signal(10);
  readonly rowKey = (row: Amenity) => row.id;
  readonly columns: readonly ManagementTableColumn<Amenity>[] = [
    { key: 'icon', label: 'Biểu tượng' },
    { key: 'name', label: 'Tên tiện ích', value: (item) => item.name },
    { key: 'code', label: 'Mã icon', value: (item) => item.icon },
    {
      key: 'date',
      label: 'Ngày tạo',
      value: (item) =>
        item.createdAt ? this.textUtils.formatDate(item.createdAt, 'dd/MM/yyyy HH:mm') : '—',
    },
    { key: 'actions', label: 'Thao tác' },
  ];
  readonly pagination = computed(() => this.result());
  changePageSize(size: number): void {
    if (this.loading()) return;
    this.pageSize.set(size);
    this.load(0);
  }

  private readonly amenityService = inject(AmenityService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  readonly textUtils = TextUtils;

  readonly searchControl = inject(FormBuilder).nonNullable.control('');
  readonly query = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  readonly result = signal<AmenityList | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  constructor() {
    this.load(0);
  }

  load(page = this.result()?.page ?? 0): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    this.amenityService
      .getAmenities(page, this.pageSize())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => this.result.set(res),
        error: (err: { status?: number; error?: { message?: string } }) => {
          this.error.set(
            err.status === 403
              ? 'Bạn không có quyền xem danh sách tiện ích.'
              : err.error?.message || 'Không thể tải danh sách tiện ích. Vui lòng thử lại sau.',
          );
        },
      });
  }

  openCreate(): void {
    this.success.set('');
    this.dialog
      .open(AmenityActionDialogComponent, {
        data: { action: 'create' },
        width: '540px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (!changed) return;
        this.success.set('Tạo tiện ích mới thành công.');
        this.load(0);
      });
  }

  openEdit(amenity: Amenity): void {
    this.success.set('');
    this.dialog
      .open(AmenityActionDialogComponent, {
        data: { amenity, action: 'edit' },
        width: '540px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (!changed) return;
        this.success.set('Cập nhật tiện ích thành công.');
        this.load();
      });
  }

  openDelete(amenity: Amenity): void {
    this.success.set('');
    this.dialog
      .open(AmenityActionDialogComponent, {
        data: { amenity, action: 'delete' },
        width: '460px',
        maxWidth: 'calc(100vw - 32px)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (!changed) return;
        this.success.set('Đã xóa tiện ích.');
        const current = this.result();
        const page = current?.page ?? 0;
        this.load(current?.items.length === 1 && page > 0 ? page - 1 : page);
      });
  }

  filteredItems(): Amenity[] {
    const list = this.result()?.items ?? [];
    const term = this.query().trim().toLowerCase();
    if (!term) return list;
    return list.filter((item) => item.name.toLowerCase().includes(term));
  }
}
