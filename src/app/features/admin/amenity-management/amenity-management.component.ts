import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AmenityService } from '@services/amenity.service';
import { Amenity, AmenityList } from '@model/amenity/amenity.model';
import { TextUtils } from '@shared/utils/text-utils';
import { AmenityActionDialogComponent } from './amenity-action-dialog/amenity-action-dialog.component';

@Component({
  selector: 'app-amenity-management',
  imports: [ReactiveFormsModule],
  templateUrl: './amenity-management.component.html',
  styleUrl: './amenity-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmenityManagementComponent {
  private readonly amenityService = inject(AmenityService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  readonly textUtils = TextUtils;

  readonly searchControl = inject(FormBuilder).nonNullable.control('');
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

    this.amenityService.getAmenities(page, 10).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: res => this.result.set(res),
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
    this.dialog.open(AmenityActionDialogComponent, {
      data: { action: 'create' },
      width: '540px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.success.set('Tạo tiện ích mới thành công.');
      this.load(0);
    });
  }

  openEdit(amenity: Amenity): void {
    this.success.set('');
    this.dialog.open(AmenityActionDialogComponent, {
      data: { amenity, action: 'edit' },
      width: '540px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.success.set('Cập nhật tiện ích thành công.');
      this.load();
    });
  }

  openDelete(amenity: Amenity): void {
    this.success.set('');
    this.dialog.open(AmenityActionDialogComponent, {
      data: { amenity, action: 'delete' },
      width: '460px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.success.set('Đã xóa tiện ích.');
      const current = this.result();
      const page = current?.page ?? 0;
      this.load(current?.items.length === 1 && page > 0 ? page - 1 : page);
    });
  }

  filteredItems(): Amenity[] {
    const list = this.result()?.items ?? [];
    const term = this.searchControl.value.trim().toLowerCase();
    if (!term) return list;
    return list.filter(item => item.name.toLowerCase().includes(term));
  }
}
