import { computed } from '@angular/core';
import {
  ManagementTableComponent,
  ManagementTableColumn,
} from '@shared/components/management-table/management-table.component';
import { ManagementTableCellDirective } from '@shared/components/management-table/management-table-cell.directive';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { AdministrativeUnitService } from '@services/address/administrative-unit.service';
import { Province, Ward } from '@model/administrative-unit.model';
import { PageResponse } from '@model/api-response';
import { WardActionDialogComponent } from './ward-action-dialog.component';

@Component({
  selector: 'app-ward-management',
  imports: [ReactiveFormsModule, ManagementTableComponent, ManagementTableCellDirective],
  templateUrl: './ward-management.component.html',
  styleUrl: './ward-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardManagementComponent {
  readonly pageSize = signal(10);
  readonly rowKey = (row: Ward) => row.id;
  readonly columns: readonly ManagementTableColumn<Ward>[] = [
    { key: 'code', label: 'Mã phường/xã', value: (ward) => ward.code },
    { key: 'name', label: 'Tên phường/xã', value: (ward) => ward.name },
    { key: 'province', label: 'Tỉnh/Thành phố', value: (ward) => ward.provinceName },
    { key: 'actions', label: 'Thao tác' },
  ];
  readonly pagination = computed(() => {
    const data = this.result();
    return data
      ? { page: data.currentPage, total: data.totalElements, totalPages: data.totalPages }
      : null;
  });
  changePageSize(size: number): void {
    if (this.loading()) return;
    this.pageSize.set(size);
    this.filters.controls.size.setValue(size);
    this.applied = { ...this.applied, size };
    this.load(0);
  }

  private readonly service = inject(AdministrativeUnitService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  readonly provinces = signal<Province[]>([]);
  readonly provincesLoading = signal(false);
  readonly provinceError = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly result = signal<PageResponse<Ward> | null>(null);
  readonly filters = inject(FormBuilder).nonNullable.group({
    q: ['', Validators.maxLength(100)],
    provinceId: [''],
    size: [10],
  });
  private applied = { q: '', provinceId: '', size: 10 };

  constructor() {
    this.loadProvinces();
    this.load(0);
  }

  loadProvinces(): void {
    if (this.provincesLoading()) return;
    this.provincesLoading.set(true);
    this.provinceError.set('');
    this.service
      .provinces()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.provincesLoading.set(false)),
      )
      .subscribe({
        next: (value) => this.provinces.set(value),
        error: () => this.provinceError.set('Không tải được tỉnh/thành phố. Vui lòng thử lại.'),
      });
  }

  search(): void {
    if (this.loading()) return;
    if (this.filters.invalid) {
      this.filters.markAllAsTouched();
      return;
    }
    this.applied = this.filters.getRawValue();
    this.success.set('');
    this.load(0);
  }

  reset(): void {
    this.filters.reset({ q: '', provinceId: '', size: this.pageSize() });
    this.search();
  }

  load(page = this.result()?.currentPage ?? 0): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.service
      .list(this.applied.q, this.applied.provinceId, page, this.applied.size)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (value) => this.result.set(value),
        error: (err) =>
          this.error.set(
            err.error?.message || 'Không tải được danh sách phường/xã. Vui lòng thử lại.',
          ),
      });
  }

  open(action: 'create' | 'edit' | 'delete', ward?: Ward): void {
    this.success.set('');
    this.dialog
      .open(WardActionDialogComponent, {
        width: '560px',
        maxWidth: 'calc(100vw - 32px)',
        data: { action, ward, provinces: this.provinces(), provinceId: this.applied.provinceId },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((outcome) => {
        if (!outcome) return;
        if (outcome === 'stale') this.loadProvinces();
        if (outcome === 'changed')
          this.success.set(
            action === 'delete'
              ? 'Đã xóa phường/xã.'
              : action === 'create'
                ? 'Đã thêm phường/xã.'
                : 'Đã cập nhật phường/xã.',
          );
        const result = this.result();
        const page = result?.currentPage ?? 0;
        this.load(
          action === 'create'
            ? 0
            : action === 'delete' && result?.data.length === 1
              ? Math.max(0, page - 1)
              : page,
        );
      });
  }
}
