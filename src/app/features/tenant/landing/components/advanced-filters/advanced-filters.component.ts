import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, finalize, of, switchMap } from 'rxjs';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { RoomRentalStatus } from '@model/room/room.model';
import { Province } from '@model/address/province.model';
import { Ward } from '@model/address/ward.model';
import { Amenity } from '@model/amenity/amenity.model';
import { RoomType } from '@model/room-type/room-type.model';
import { AddressService } from '@services/address/address.service';
import { AmenityService } from '@services/room/amenity.service';
import { RoomTypeService } from '@services/room/room-type.service';

export interface AdvancedFilterSelection {
  query: RoomQueryParams;
  labels: { province: string; ward: string };
}
@Component({
  selector: 'app-advanced-filters',
  imports: [ReactiveFormsModule],
  templateUrl: './advanced-filters.component.html',
  styleUrl: './advanced-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedFiltersComponent implements OnChanges {
  @Input() query: RoomQueryParams = {};
  @Input() searching = false;
  @Output() readonly apply = new EventEmitter<AdvancedFilterSelection>();
  @Output() readonly clear = new EventEmitter<void>();
  private readonly addresses = inject(AddressService);
  private readonly amenitiesApi = inject(AmenityService);
  private readonly typesApi = inject(RoomTypeService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);
  private readonly wardRequests = new Subject<string>();
  readonly provinces = signal<Province[]>([]);
  readonly wards = signal<Ward[]>([]);
  readonly amenities = signal<Amenity[]>([]);
  readonly types = signal<RoomType[]>([]);
  readonly optionError = signal('');
  readonly wardError = signal('');
  readonly wardsLoading = signal(false);
  readonly form = this.fb.group(
    {
      provinceId: this.fb.nonNullable.control(''),
      wardId: this.fb.nonNullable.control(''),
      roomTypeName: this.fb.nonNullable.control(''),
      minPrice: this.fb.control<number | null>(null, [
        Validators.min(0),
        Validators.max(9999999999.99),
      ]),
      maxPrice: this.fb.control<number | null>(null, [
        Validators.min(0),
        Validators.max(9999999999.99),
      ]),
      onlyAvailable: this.fb.nonNullable.control(true),
      amenityNames: this.fb.nonNullable.control<string[]>([]),
    },
    {
      validators: (control) => {
        const { minPrice, maxPrice } = control.value;
        return minPrice != null && maxPrice != null && minPrice > maxPrice
          ? { priceRange: true }
          : null;
      },
    },
  );
  constructor() {
    this.wardRequests
      .pipe(
        switchMap((id) => {
          this.wardError.set('');
          this.wards.set([]);
          this.wardsLoading.set(!!id);
          return (id ? this.addresses.getAllWards(id) : of([] as Ward[])).pipe(
            catchError(() => {
              this.wardError.set('Không tải được phường/xã. Chọn lại tỉnh/thành để thử lại.');
              return of([] as Ward[]);
            }),
            finalize(() => this.wardsLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((wards) => this.wards.set(wards));
    this.form.controls.provinceId.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((id) => {
        this.form.controls.wardId.setValue('');
        this.wardRequests.next(id);
      });
    this.loadOptions();
  }
  ngOnChanges(changes?: SimpleChanges): void {
    if (changes && !changes['query']) return;
    this.form.reset(
      {
        provinceId: this.query.provinceId ?? '',
        wardId: this.query.wardId ?? '',
        roomTypeName: this.query.roomTypeName ?? '',
        minPrice: this.query.minPrice ?? null,
        maxPrice: this.query.maxPrice ?? null,
        onlyAvailable: this.query.rentalStatus === RoomRentalStatus.AVAILABLE,
        amenityNames: [...(this.query.amenityNames ?? [])],
      },
      { emitEvent: false },
    );
    this.wardRequests.next(this.query.provinceId ?? '');
  }
  loadOptions(): void {
    this.optionError.set('');
    const failed = () =>
      this.optionError.set(
        'Một số lựa chọn chưa tải được. Bạn có thể thử lại hoặc tiếp tục với các điều kiện đã chọn.',
      );
    this.addresses
      .getProvinces()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({ next: (values) => this.provinces.set(values), error: failed });
    this.amenitiesApi
      .getAllAmenities()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({ next: (values) => this.amenities.set(values), error: failed });
    this.typesApi
      .getAllRoomTypes()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({ next: (values) => this.types.set(values), error: failed });
  }
  toggleAmenity(name: string): void {
    const control = this.form.controls.amenityNames;
    control.setValue(
      control.value.includes(name)
        ? control.value.filter((value) => value !== name)
        : [...control.value, name],
    );
  }
  budget(minPrice: number | null, maxPrice: number | null): void {
    this.form.patchValue({ minPrice, maxPrice });
  }
  submit(): void {
    if (this.searching) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.apply.emit({
      query: {
        provinceId: value.provinceId || undefined,
        wardId: value.wardId || undefined,
        roomTypeName: value.roomTypeName || undefined,
        minPrice: value.minPrice ?? undefined,
        maxPrice: value.maxPrice ?? undefined,
        rentalStatus: value.onlyAvailable ? RoomRentalStatus.AVAILABLE : '',
        amenityNames: value.amenityNames,
      },
      labels: {
        province: this.provinces().find((p) => p.id === value.provinceId)?.name ?? '',
        ward: this.wards().find((w) => w.id === value.wardId)?.name ?? '',
      },
    });
  }
}
