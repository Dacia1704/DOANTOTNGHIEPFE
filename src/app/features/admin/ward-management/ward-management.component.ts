import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { AdministrativeUnitService } from '@services/administrative-unit.service';
import { Province, Ward } from '@model/administrative-unit.model';
import { PageResponse } from '@model/api-response';
import { WardActionDialogComponent } from './ward-action-dialog.component';

@Component({
  selector: 'app-ward-management',
  imports: [ReactiveFormsModule],
  templateUrl: './ward-management.component.html',
  styleUrl: './ward-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardManagementComponent {
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
    q: ['', Validators.maxLength(100)], provinceId: [''], size: [20],
  });
  private applied = { q: '', provinceId: '', size: 20 };

  constructor() { this.loadProvinces(); this.load(0); }

  loadProvinces(): void {
    if (this.provincesLoading()) return;
    this.provincesLoading.set(true);
    this.provinceError.set('');
    this.service.provinces().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.provincesLoading.set(false))).subscribe({
      next: value => this.provinces.set(value),
      error: () => this.provinceError.set('Không tải được tỉnh/thành phố. Vui lòng thử lại.'),
    });
  }

  search(): void {
    if (this.loading()) return;
    if (this.filters.invalid) { this.filters.markAllAsTouched(); return; }
    this.applied = this.filters.getRawValue();
    this.success.set('');
    this.load(0);
  }

  reset(): void {
    this.filters.reset({ q: '', provinceId: '', size: 20 });
    this.search();
  }

  load(page = this.result()?.currentPage ?? 0): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.service.list(this.applied.q, this.applied.provinceId, page, this.applied.size).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)),
    ).subscribe({
      next: value => this.result.set(value),
      error: err => this.error.set(err.error?.message || 'Không tải được danh sách phường/xã. Vui lòng thử lại.'),
    });
  }

  open(action: 'create' | 'edit' | 'delete', ward?: Ward): void {
    this.success.set('');
    this.dialog.open(WardActionDialogComponent, {
      width: '560px', maxWidth: 'calc(100vw - 32px)',
      data: { action, ward, provinces: this.provinces(), provinceId: this.applied.provinceId },
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(outcome => {
      if (!outcome) return;
      if (outcome === 'stale') this.loadProvinces();
      if (outcome === 'changed') this.success.set(action === 'delete' ? 'Đã xóa phường/xã.' : action === 'create' ? 'Đã thêm phường/xã.' : 'Đã cập nhật phường/xã.');
      const result = this.result();
      const page = result?.currentPage ?? 0;
      this.load(action === 'create' ? 0 : action === 'delete' && result?.data.length === 1 ? Math.max(0, page - 1) : page);
    });
  }
}
