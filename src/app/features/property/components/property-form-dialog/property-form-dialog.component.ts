import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { PropertyService } from '@services/property.service';
import { PropertyTypeService } from '@services/property-type.service';
import { RoomTypeService } from '@services/room-type.service';
import { AmenityService } from '@services/amenity.service';
import { AddressService } from '@services/address.service';
import { Property } from '@model/property/property.model';
import {
  PropertyRentalMode,
  CreateFloorRequest,
} from '@model/property/request/create-property-request';
import { PropertyType } from '@model/property-type/property-type.model';
import { RoomType } from '@model/room-type/room-type.model';
import { Amenity } from '@model/amenity/amenity.model';
import { Province } from '@model/address/province.model';
import { Ward } from '@model/address/ward.model';
import { TextUtils } from '@shared/utils/text-utils';
import { RoomUtils } from '@shared/utils/room-utils';
import { createPropertyUnitForm } from '../../models/property-unit-form';
import { PropertyUnitEditorComponent } from '../property-unit-editor/property-unit-editor.component';

@Component({
  selector: 'app-property-form-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, PropertyUnitEditorComponent],
  templateUrl: './property-form-dialog.component.html',
  styleUrl: './property-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PropertyService);
  private readonly propertyTypesService = inject(PropertyTypeService);
  private readonly roomTypesService = inject(RoomTypeService);
  private readonly amenitiesService = inject(AmenityService);
  private readonly address = inject(AddressService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref = inject(MatDialogRef<PropertyFormDialogComponent, Property>);
  readonly step = signal(0);
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly wardError = signal('');
  readonly wardsLoading = signal(false);
  readonly propertyTypes = signal<PropertyType[]>([]);
  readonly roomTypes = signal<RoomType[]>([]);
  readonly amenities = signal<Amenity[]>([]);
  readonly provinces = signal<Province[]>([]);
  readonly wards = signal<Ward[]>([]);
  readonly money = TextUtils.toVnd;
  readonly fee = RoomUtils.formatFee;
  readonly info = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    propertyTypeId: ['', Validators.required],
    rentalMode: ['BY_ROOM' as PropertyRentalMode, Validators.required],
    totalFloors: this.fb.control<number | null>(null, [
      Validators.min(0),
      Validators.pattern(/^\d+$/),
    ]),
    provinceId: ['', Validators.required],
    wardId: ['', Validators.required],
    addressLine: ['', [Validators.required, Validators.maxLength(255), Validators.pattern(/\S/)]],
    latitude: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]),
    longitude: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]),
    amenityIds: this.fb.nonNullable.control<string[]>([]),
  });
  readonly defaults = this.fb.group({
    roomTypeId: this.fb.nonNullable.control('', Validators.required),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    areaM2: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    maxOccupants: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.pattern(/^\d+$/),
    ]),
    electricityPrice: this.fb.control<number | null>(null, Validators.min(0)),
    waterPrice: this.fb.control<number | null>(null, Validators.min(0)),
    serviceFee: this.fb.control<number | null>(null, Validators.min(0)),
    defaultDeposit: this.fb.control<number | null>(null, Validators.min(0)),
  });
  readonly units = this.fb.array([createPropertyUnitForm(this.fb)]);

  ngOnInit(): void {
    this.loadCatalogs();
    this.info.controls.provinceId.valueChanges
      .pipe(
        switchMap((id) => {
          this.info.controls.wardId.setValue('');
          this.wards.set([]);
          this.wardError.set('');
          if (!id) return of([] as Ward[]);
          this.wardsLoading.set(true);
          return this.address.getAllWards(id).pipe(
            catchError(() => {
              this.wardError.set('Không tải được phường/xã. Hãy chọn lại tỉnh để thử lại.');
              return of([] as Ward[]);
            }),
            finalize(() => this.wardsLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((wards) => this.wards.set(wards));
  }

  loadCatalogs(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      propertyTypes: this.propertyTypesService.getAll(),
      roomTypes: this.roomTypesService.getAllRoomTypes(),
      amenities: this.amenitiesService.getAllAmenities(),
      provinces: this.address.getProvinces(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (data) => {
          this.propertyTypes.set(
            data.propertyTypes.filter((type) => type.id !== '00000000-0000-0000-0000-000000000011'),
          );
          this.roomTypes.set(data.roomTypes);
          this.amenities.set(data.amenities);
          this.provinces.set(data.provinces);
        },
        error: (err) =>
          this.error.set(
            err.error?.message || 'Không tải được danh mục và địa chỉ. Vui lòng thử lại.',
          ),
      });
  }
  toggleAmenity(id: string): void {
    const control = this.info.controls.amenityIds;
    control.setValue(
      control.value.includes(id)
        ? control.value.filter((value) => value !== id)
        : [...control.value, id],
    );
  }
  addUnit(): void {
    if (this.info.controls.rentalMode.value === 'BY_ROOM')
      this.units.push(createPropertyUnitForm(this.fb));
  }
  removeUnit(index: number): void {
    if (this.units.length > 1) this.units.removeAt(index);
  }
  next(): void {
    this.error.set('');
    if (this.step() === 0) {
      this.info.markAllAsTouched();
      if (this.info.invalid || this.wardsLoading() || this.wardError()) {
        this.error.set('Kiểm tra thông tin cơ sở và địa chỉ trước khi tiếp tục.');
        return;
      }
    } else if (!this.validateUnits()) return;
    this.step.update((step) => Math.min(2, step + 1));
  }
  private validateUnits(): boolean {
    this.defaults.markAllAsTouched();
    if (this.isWhole()) {
      if (this.defaults.invalid) {
        this.error.set('Kiểm tra giá thuê, diện tích và số người của căn nhà.');
        return false;
      }
      return true;
    }
    this.units.markAllAsTouched();
    if (this.defaults.invalid || this.units.invalid) {
      this.error.set('Kiểm tra giá mặc định, diện tích, số người và thông tin từng phòng.');
      return false;
    }
    const numbers = this.units.controls.map((unit) =>
      unit.controls.roomNumber.value.trim().toLocaleLowerCase('vi'),
    );
    if (new Set(numbers).size !== numbers.length) {
      this.error.set('Số phòng bị trùng trong cùng cơ sở. Vui lòng sửa trước khi tiếp tục.');
      return false;
    }
    return true;
  }
  isWhole(): boolean {
    return this.info.controls.rentalMode.value === 'WHOLE';
  }
  amenityNames(ids: string[]): string {
    return (
      this.amenities()
        .filter((a) => ids.includes(a.id))
        .map((a) => a.name)
        .join(', ') || 'Chưa chọn'
    );
  }
  addressLabel(): string {
    return [
      this.info.controls.addressLine.value,
      this.wards().find((w) => w.id === this.info.controls.wardId.value)?.name,
      this.provinces().find((p) => p.id === this.info.controls.provinceId.value)?.name,
    ]
      .filter(Boolean)
      .join(', ');
  }
  roomTypeName(id: string | null | undefined): string {
    return this.roomTypes().find((type) => type.id === id)?.name ?? 'Chưa chọn';
  }
  submit(): void {
    if (this.busy() || this.loading()) return;
    this.error.set('');
    if (this.info.invalid) {
      this.step.set(0);
      this.info.markAllAsTouched();
      return;
    }
    if (!this.validateUnits()) {
      this.step.set(1);
      return;
    }
    const floors = new Map<number | null, CreateFloorRequest>();
    for (const unit of this.isWhole() ? [] : this.units.controls) {
      const { floorNumber, ...values } = unit.getRawValue();
      const floor = floors.get(floorNumber) ?? { floorNumber, rooms: [] };
      floor.rooms.push({ ...values, roomNumber: values.roomNumber.trim() });
      floors.set(floorNumber, floor);
    }
    if (this.isWhole()) {
      floors.set(null, { floorNumber: null, rooms: [{ roomNumber: 'WHOLE', amenityIds: [] }] });
    }
    const info = this.info.getRawValue();
    this.busy.set(true);
    this.ref.disableClose = true;
    this.service
      .create({
        ...info,
        name: info.name.trim(),
        addressLine: info.addressLine.trim(),
        defaultRoom: this.defaults.getRawValue(),
        floors: [...floors.values()],
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: (property) => this.ref.close(property),
        error: (err) =>
          this.error.set(
            err.error?.message ||
              'Chưa lưu được cơ sở. Thông tin bạn nhập vẫn được giữ lại để thử lại.',
          ),
      });
  }
}
