import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { AmenityService } from '@services/amenity.service';
import { Amenity } from '@model/amenity/amenity.model';

export interface AmenityActionData {
  amenity?: Amenity;
  action: 'create' | 'edit' | 'delete';
}

@Component({
  selector: 'app-amenity-action-dialog',
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './amenity-action-dialog.component.html',
  styleUrl: './amenity-action-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmenityActionDialogComponent {
  readonly data = inject<AmenityActionData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<AmenityActionDialogComponent, boolean>);
  private readonly amenityService = inject(AmenityService);
  private readonly destroyRef = inject(DestroyRef);

  readonly busy = signal(false);
  readonly error = signal('');

  // Popular icon suggestions
  readonly suggestedIcons = [
    { icon: 'ac_unit', label: 'Điều hòa' },
    { icon: 'wifi', label: 'Wifi' },
    { icon: 'local_parking', label: 'Gửi xe' },
    { icon: 'water_drop', label: 'Nước nóng' },
    { icon: 'kitchen', label: 'Tủ lạnh / Bếp' },
    { icon: 'tv', label: 'Tivi' },
    { icon: 'local_laundry_service', label: 'Máy giặt' },
    { icon: 'bed', label: 'Giường nệm' },
    { icon: 'elevator', label: 'Thang máy' },
    { icon: 'security', label: 'Bảo vệ / Camera' },
    { icon: 'balcony', label: 'Ban công' },
    { icon: 'shower', label: 'WC riêng' },
  ];

  readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data.amenity?.name ?? '', [Validators.required, Validators.maxLength(100)]],
    icon: [this.data.amenity?.icon ?? 'check_circle', [Validators.maxLength(255)]],
  });

  selectIcon(icon: string): void {
    this.form.patchValue({ icon });
  }

  submit(): void {
    if (this.busy()) return;
    if (this.data.action !== 'delete' && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;

    const values = this.form.getRawValue();
    let req: Observable<unknown>;

    if (this.data.action === 'delete') {
      req = this.amenityService.deleteAmenity(this.data.amenity!.id);
    } else if (this.data.action === 'edit') {
      req = this.amenityService.updateAmenity(this.data.amenity!.id, {
        name: values.name.trim(),
        icon: values.icon.trim() || 'check_circle',
      });
    } else {
      req = this.amenityService.createAmenity({
        name: values.name.trim(),
        icon: values.icon.trim() || 'check_circle',
      });
    }

    req.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.busy.set(false);
        this.ref.disableClose = false;
      }),
    ).subscribe({
      next: () => this.ref.close(true),
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.error.set(
          err.error?.message ||
            (err.status === 403
              ? 'Bạn không có quyền thực hiện thao tác này.'
              : 'Không thực hiện được yêu cầu. Vui lòng thử lại.'),
        );
      },
    });
  }
}
