import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  switchMap,
  catchError,
  of,
} from 'rxjs';
import {
  TenantPreferencesService,
  TenantPreferences,
  NearbyPlace,
} from '@services/identity/tenant-preferences.service';
import { AddressService } from '@services/address/address.service';
import { AmenityService } from '@services/room/amenity.service';
import { RoomTypeService } from '@services/room/room-type.service';
import { Province } from '@model/address/province.model';
import { Ward } from '@model/address/ward.model';
import { Amenity } from '@model/amenity/amenity.model';
import { RoomType } from '@model/room-type/room-type.model';
import { Coordinates, MapPlace } from '@model/maps/maps.model';
import { MapCanvasComponent } from '@shared/components/map-canvas/map-canvas.component';
import { MapPlaceSearchComponent } from '@shared/components/map-place-search/map-place-search.component';

@Component({
  selector: 'app-tenant-preferences',
  imports: [ReactiveFormsModule, DecimalPipe, MapCanvasComponent, MapPlaceSearchComponent],
  templateUrl: './tenant-preferences.component.html',
  styleUrl: './tenant-preferences.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantPreferencesComponent {
  private readonly api = inject(TenantPreferencesService);
  private readonly address = inject(AddressService);
  private readonly amenitiesApi = inject(AmenityService);
  private readonly typesApi = inject(RoomTypeService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(MatSnackBar);
  private readonly query = new Subject<string>();
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly loadError = signal('');
  readonly placesError = signal('');
  readonly placesLoading = signal(false);
  readonly wardError = signal('');
  readonly saved = signal(false);
  readonly provinces = signal<Province[]>([]);
  readonly wards = signal<Ward[]>([]);
  readonly amenities = signal<Amenity[]>([]);
  readonly types = signal<RoomType[]>([]);
  readonly places = signal<NearbyPlace[]>([]);
  readonly point = signal<Coordinates | null>(null);
  readonly pins = computed(() =>
    this.point() ? [{ ...this.point()!, id: 'location', title: 'Địa điểm muốn ở gần' }] : [],
  );
  readonly form = this.fb.group(
    {
      tenantType: this.fb.control<string | null>(null),
      occupants: this.fb.control<number | null>(1, [
        Validators.min(1),
        Validators.max(50),
        Validators.pattern(/^\d+$/),
      ]),
      moveInDate: this.fb.control<string | null>(null),
      desiredProvinceId: this.fb.control<string | null>(null),
      wardIds: this.fb.nonNullable.control<string[]>([], Validators.maxLength(5)),
      desiredRoomTypeId: this.fb.control<string | null>(null),
      priceMin: this.fb.control<number | null>(null, [
        Validators.min(0),
        Validators.max(9999999999.99),
      ]),
      priceMax: this.fb.control<number | null>(null, [
        Validators.min(0),
        Validators.max(9999999999.99),
      ]),
      areaMin: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(999999.99)]),
      areaMax: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(999999.99)]),
      anchorPlaceId: this.fb.control<string | null>(null),
      anchorLabel: this.fb.control<string | null>(null, Validators.maxLength(255)),
      anchorLatitude: this.fb.control<number | null>(null, [
        Validators.min(-90),
        Validators.max(90),
      ]),
      anchorLongitude: this.fb.control<number | null>(null, [
        Validators.min(-180),
        Validators.max(180),
      ]),
      maxDistanceKm: this.fb.control<number | null>(3.5, [
        Validators.min(0.1),
        Validators.max(100),
      ]),
      priceTolerancePct: this.fb.nonNullable.control(20, [
        Validators.min(0),
        Validators.max(50),
        Validators.pattern(/^\d+$/),
      ]),
      topPriority: this.fb.control<string | null>('PRICE'),
      note: this.fb.control<string | null>(null, Validators.maxLength(500)),
      allowPersonalization: this.fb.nonNullable.control(true),
      amenityIds: this.fb.nonNullable.control<string[]>([]),
      requiredAmenityIds: this.fb.nonNullable.control<string[]>([]),
    },
    {
      validators: (control) => {
        const v = control.value;
        if (v.priceMin != null && v.priceMax != null && v.priceMin > v.priceMax)
          return { priceRange: true };
        if (v.areaMin != null && v.areaMax != null && v.areaMin > v.areaMax)
          return { areaRange: true };
        if ((v.anchorLatitude == null) !== (v.anchorLongitude == null))
          return { coordinates: true };
        return null;
      },
    },
  );

  constructor() {
    this.query
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          this.placesLoading.set(true);
          this.placesError.set('');
          return this.api.places(q).pipe(
            catchError(() => {
              this.placesError.set(
                'Không tải được danh mục địa điểm. Bạn vẫn có thể chấm trên bản đồ.',
              );
              return of([] as NearbyPlace[]);
            }),
            finalize(() => this.placesLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((places) => this.places.set(places));
    this.form.controls.desiredProvinceId.valueChanges
      .pipe(
        switchMap((id) => {
          this.form.controls.wardIds.setValue([]);
          this.wards.set([]);
          this.wardError.set('');
          return id
            ? this.address.getAllWards(id).pipe(
                catchError(() => {
                  this.wardError.set(
                    'Không tải được phường/xã. Hãy chọn lại tỉnh/thành để thử lại.',
                  );
                  return of([]);
                }),
              )
            : of([]);
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((wards) => this.wards.set(wards));
    this.load();
    this.searchPlaces('');
  }
  load(): void {
    this.loading.set(true);
    this.loadError.set('');
    forkJoin({
      profile: this.api.get(),
      provinces: this.address.getProvinces(),
      amenities: this.amenitiesApi.getAllAmenities(),
      types: this.typesApi.getAllRoomTypes(),
    })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (data) => {
          this.provinces.set(data.provinces);
          this.amenities.set(data.amenities);
          this.types.set(data.types);
          if (data.profile) this.apply(data.profile);
        },
        error: () => this.loadError.set('Không tải được hồ sơ tìm trọ. Vui lòng thử lại.'),
      });
  }
  searchPlaces(q: string): void {
    this.query.next(q);
  }
  selectPlace(place: NearbyPlace): void {
    if (this.busy()) return;
    this.form.patchValue({
      anchorPlaceId: place.id,
      anchorLabel: place.name,
      anchorLatitude: Number(place.latitude),
      anchorLongitude: Number(place.longitude),
    });
    this.point.set({ latitude: Number(place.latitude), longitude: Number(place.longitude) });
    this.changed();
  }
  mapPosition(point: Coordinates): void {
    if (this.busy()) return;
    this.form.patchValue({
      anchorPlaceId: null,
      anchorLabel: null,
      anchorLatitude: point.latitude,
      anchorLongitude: point.longitude,
    });
    this.point.set(point);
    this.changed();
  }
  searchedPlace(place: MapPlace): void {
    this.mapPosition(place);
    this.form.controls.anchorLabel.setValue(place.name || place.address);
  }
  clearPlace(): void {
    this.form.patchValue({
      anchorPlaceId: null,
      anchorLabel: null,
      anchorLatitude: null,
      anchorLongitude: null,
    });
    this.point.set(null);
    this.changed();
  }
  toggleWard(id: string): void {
    const control = this.form.controls.wardIds;
    const ids = control.value;
    if (!ids.includes(id) && ids.length >= 5) {
      this.toast.open('Chọn tối đa 5 phường/xã.', 'Đóng', { duration: 3000 });
      return;
    }
    control.setValue(ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id]);
    this.changed();
  }
  toggleAmenity(id: string): void {
    const control = this.form.controls.amenityIds;
    const selected = control.value.includes(id);
    control.setValue(selected ? control.value.filter((v) => v !== id) : [...control.value, id]);
    if (selected)
      this.form.controls.requiredAmenityIds.setValue(
        this.form.controls.requiredAmenityIds.value.filter((v) => v !== id),
      );
    this.changed();
  }
  toggleRequired(id: string): void {
    const control = this.form.controls.requiredAmenityIds;
    control.setValue(
      control.value.includes(id) ? control.value.filter((v) => v !== id) : [...control.value, id],
    );
    this.changed();
  }
  budget(min: number, max: number | null): void {
    this.form.patchValue({ priceMin: min, priceMax: max });
    this.changed();
  }
  changed(): void {
    this.form.markAsDirty();
    this.saved.set(false);
  }
  save(): void {
    if (this.busy() || this.loading() || this.loadError()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.saved.set(false);
    const value = this.form.getRawValue();
    for (const key of [
      'tenantType',
      'moveInDate',
      'desiredProvinceId',
      'desiredRoomTypeId',
      'topPriority',
    ] as const)
      if (value[key] === '') value[key] = null;
    this.api
      .save(value)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (profile) => {
          this.apply(profile);
          this.saved.set(true);
          this.toast.open('Đã lưu hồ sơ tìm trọ.', 'Đóng', { duration: 3500 });
        },
        error: (err) =>
          this.toast.open(err.error?.message || 'Không lưu được hồ sơ. Vui lòng thử lại.', 'Đóng', {
            duration: 5000,
          }),
      });
  }
  private apply(profile: TenantPreferences): void {
    this.form.reset(profile, { emitEvent: false });
    this.point.set(
      profile.anchorLatitude != null && profile.anchorLongitude != null
        ? {
            latitude: Number(profile.anchorLatitude),
            longitude: Number(profile.anchorLongitude),
          }
        : null,
    );
    this.wardError.set('');
    if (profile.desiredProvinceId)
      this.address
        .getAllWards(profile.desiredProvinceId)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (wards) => this.wards.set(wards),
          error: () =>
            this.wardError.set('Không tải được phường/xã. Hãy chọn lại tỉnh/thành để thử lại.'),
        });
    else this.wards.set([]);
  }
}
