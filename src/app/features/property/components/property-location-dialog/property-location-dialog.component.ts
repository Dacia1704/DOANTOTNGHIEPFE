import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, merge, of, switchMap } from 'rxjs';
import { Property } from '@model/property/property.model';
import { Coordinates, MapPlace } from '@model/maps/maps.model';
import { Province } from '@model/address/province.model';
import { Ward } from '@model/address/ward.model';
import { AddressService } from '@services/address.service';
import { PropertyService } from '@services/property.service';
import { LocationUtils } from '@shared/utils/location-utils';
import { LocationPickerComponent } from '@shared/components/location-picker/location-picker.component';

@Component({
  selector: 'app-property-location-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, LocationPickerComponent],
  templateUrl: './property-location-dialog.component.html',
  styleUrl: './property-location-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyLocationDialogComponent implements OnInit {
  readonly property = inject<Property>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<PropertyLocationDialogComponent, Property>);
  private readonly address = inject(AddressService);
  private readonly properties = inject(PropertyService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly provinces = signal<Province[]>([]);
  readonly wards = signal<Ward[]>([]);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly addressError = signal('');
  readonly pinCleared = signal(false);
  readonly form = this.fb.nonNullable.group(
    {
      provinceId: [this.property.provinceId ?? '', Validators.required],
      wardId: [this.property.wardId ?? '', Validators.required],
      addressLine: [
        this.property.addressLine ?? '',
        [Validators.required, Validators.maxLength(255), Validators.pattern(/\S/)],
      ],
      latitude: this.fb.control<number | null>(this.property.latitude ?? null),
      longitude: this.fb.control<number | null>(this.property.longitude ?? null),
    },
    { validators: LocationUtils.coordinatePair },
  );

  ngOnInit(): void {
    this.address
      .getProvinces()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (provinces) => this.provinces.set(provinces),
        error: () =>
          this.addressError.set('Không tải được tỉnh/thành phố. Hãy mở lại form để thử lại.'),
      });
    merge(
      this.form.controls.provinceId.valueChanges,
      this.form.controls.wardId.valueChanges,
      this.form.controls.addressLine.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        if (
          this.form.controls.latitude.value != null ||
          this.form.controls.longitude.value != null
        ) {
          this.setLocation(null);
          this.pinCleared.set(true);
        }
      });
    let initial = true;
    merge(of(this.form.controls.provinceId.value), this.form.controls.provinceId.valueChanges)
      .pipe(
        switchMap((id) => {
          if (!initial) this.form.controls.wardId.setValue('');
          initial = false;
          this.error.set('');
          this.wards.set([]);
          this.loading.set(true);
          return (id ? this.address.getAllWards(id) : of([] as Ward[])).pipe(
            catchError(() => {
              this.error.set('Không tải được phường/xã. Chọn lại tỉnh để thử lại.');
              return of([] as Ward[]);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((wards) => this.wards.set(wards));
  }
  setLocation(point: Coordinates | null): void {
    this.form.patchValue({
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
    });
    if (point) this.pinCleared.set(false);
  }
  usePlaceAddress(place: MapPlace): void {
    if (place.addressLine?.trim())
      this.form.controls.addressLine.setValue(place.addressLine.trim());
  }
  save(): void {
    if (this.busy() || this.loading()) return;
    this.form.markAllAsTouched();
    this.error.set('');
    const value = this.form.getRawValue();
    if (
      this.form.invalid ||
      !this.provinces().some((p) => p.id === value.provinceId) ||
      !this.wards().some((w) => w.id === value.wardId && w.provinceId === value.provinceId)
    ) {
      this.error.set('Kiểm tra địa chỉ, tỉnh/phường và chọn lại ghim nếu cần.');
      return;
    }
    this.busy.set(true);
    this.ref.disableClose = true;
    this.properties
      .updateLocation(this.property.id, { ...value, addressLine: value.addressLine.trim() })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: (property) => this.ref.close(property),
        error: (error) =>
          this.error.set(
            error?.error?.message ||
              'Chưa lưu được vị trí. Thông tin đã nhập được giữ lại để thử lại.',
          ),
      });
  }
}
