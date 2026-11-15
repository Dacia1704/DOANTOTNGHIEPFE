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
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  combineLatest,
  finalize,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { PublicListingService } from '@services/listing/public-listing.service';
import { AddressService } from '@services/address/address.service';
import { AmenityService } from '@services/room/amenity.service';
import { RoomTypeService } from '@services/room/room-type.service';
import { PropertyTypeService } from '@services/property/property-type.service';
import { GeolocationService } from '@services/maps/geolocation.service';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { PublicListing, PublicListingList } from '@model/public-listing/public-listing.model';
import { RoomRentalStatus } from '@model/room/room.model';
import { Province } from '@model/address/province.model';
import { Ward } from '@model/address/ward.model';
import { Amenity } from '@model/amenity/amenity.model';
import { RoomType } from '@model/room-type/room-type.model';
import { PropertyType } from '@model/property-type/property-type.model';
import { LocationFilter, MapPlace } from '@model/maps/maps.model';
import { RoomTypeUtils } from '@shared/utils/room-type-utils';
import { RoomCardComponent } from '../landing/components/room-card/room-card.component';
import { ListingMapComponent } from '../landing/components/listing-map/listing-map.component';
import { MapPlaceSearchComponent } from '@shared/components/map-place-search/map-place-search.component';
import { BillingPagerComponent } from '@shared/components/billing-pager/billing-pager.component';
import { FeedImpressionDirective } from '@shared/directives/feed-impression.directive';

@Component({
  selector: 'app-room-search',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    RoomCardComponent,
    ListingMapComponent,
    MapPlaceSearchComponent,
    BillingPagerComponent,
    FeedImpressionDirective,
  ],
  templateUrl: './room-search.component.html',
  styleUrl: './room-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomSearchComponent {
  private readonly api = inject(PublicListingService);
  private readonly addresses = inject(AddressService);
  private readonly amenitiesApi = inject(AmenityService);
  private readonly roomTypesApi = inject(RoomTypeService);
  private readonly propertyTypesApi = inject(PropertyTypeService);
  private readonly geolocation = inject(GeolocationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly refresh = new Subject<void>();
  private readonly wardRequests = new Subject<string>();
  private wardProvince = '';
  readonly query = signal<RoomQueryParams>({});
  readonly result = signal<PublicListingList | null>(null);
  readonly mapListings = signal<PublicListing[] | null>(null);
  readonly mapCenter = signal<{ latitude: number; longitude: number } | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly mapError = signal('');
  readonly formError = signal('');
  readonly optionError = signal('');
  readonly wardError = signal('');
  readonly locating = signal(false);
  readonly locationError = signal('');
  readonly view = signal<'list' | 'map'>('list');
  readonly filtersOpen = signal(false);
  readonly placeName = signal('');
  readonly provinces = signal<Province[]>([]);
  readonly wards = signal<Ward[]>([]);
  readonly amenities = signal<Amenity[]>([]);
  readonly types = signal<RoomType[]>([]);
  readonly propertyTypes = signal<PropertyType[]>([]);
  readonly wardsLoading = signal(false);
  readonly typeOptions = computed(() => RoomTypeUtils.options(this.types()));
  readonly sorts = [
    { value: 'recommended', label: 'Phù hợp với bạn' },
    { value: 'newest', label: 'Mới nhất' },
    { value: 'price-asc', label: 'Giá tăng dần' },
    { value: 'price-desc', label: 'Giá giảm dần' },
  ];
  readonly pricePresets = [
    { label: 'Dưới 2 triệu', min: null, max: 2000000 },
    { label: '2 – 4 triệu', min: 2000000, max: 4000000 },
    { label: '4 – 6 triệu', min: 4000000, max: 6000000 },
    { label: 'Trên 6 triệu', min: 6000000, max: null },
  ];
  readonly areaPresets = [
    { label: 'Đến 20 m²', min: null, max: 20 },
    { label: '20 – 30 m²', min: 20, max: 30 },
    { label: '30 – 45 m²', min: 30, max: 45 },
    { label: 'Từ 45 m²', min: 45, max: null },
  ];
  readonly feeFields = [
    { key: 'maxDeposit', label: 'Tiền cọc tối đa (đ)', step: 100000 },
    { key: 'maxElectricityPrice', label: 'Giá điện tối đa (đ)', step: 500 },
    { key: 'maxWaterPrice', label: 'Giá nước tối đa (đ)', step: 1000 },
    { key: 'maxServiceFee', label: 'Phí dịch vụ tối đa (đ)', step: 10000 },
  ];
  private amount() {
    return this.fb.control<number | null>(null, [Validators.min(0), Validators.max(9999999999)]);
  }
  readonly form = this.fb.group(
    {
      keyword: this.fb.nonNullable.control('', Validators.maxLength(100)),
      provinceId: this.fb.nonNullable.control(''),
      wardId: this.fb.nonNullable.control(''),
      rentalMode: this.fb.nonNullable.control<'' | 'WHOLE' | 'BY_ROOM'>(''),
      propertyTypeId: this.fb.nonNullable.control(''),
      roomTypeName: this.fb.nonNullable.control(''),
      minPrice: this.amount(),
      maxPrice: this.amount(),
      minArea: this.amount(),
      maxArea: this.amount(),
      minOccupants: this.fb.control<number | null>(null, [
        Validators.min(1),
        Validators.max(100),
        Validators.pattern(/^\d+$/),
      ]),
      minFloor: this.fb.control<number | null>(null, [
        Validators.min(0),
        Validators.max(200),
        Validators.pattern(/^\d+$/),
      ]),
      maxFloor: this.fb.control<number | null>(null, [
        Validators.min(0),
        Validators.max(200),
        Validators.pattern(/^\d+$/),
      ]),
      maxDeposit: this.amount(),
      maxElectricityPrice: this.amount(),
      maxWaterPrice: this.amount(),
      maxServiceFee: this.amount(),
      amenityNames: this.fb.nonNullable.control<string[]>([]),
      latitude: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]),
      longitude: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]),
      radiusKm: this.fb.control<number | null>(null, [Validators.min(0.1), Validators.max(100)]),
    },
    {
      validators: (control) => {
        for (const [min, max] of [
          ['minPrice', 'maxPrice'],
          ['minArea', 'maxArea'],
          ['minFloor', 'maxFloor'],
        ]) {
          const low = control.get(min)?.value,
            high = control.get(max)?.value;
          if (low != null && high != null && low > high) return { range: true };
        }
        const { latitude, longitude, radiusKm } = control.value;
        return [latitude, longitude, radiusKm].some((v) => v != null) &&
          [latitude, longitude, radiusKm].some((v) => v == null)
          ? { location: true }
          : null;
      },
    },
  );
  readonly chips = computed(() => {
    const q = this.query();
    const chips: { key: string; label: string }[] = [];
    if (q.keyword) chips.push({ key: 'keyword', label: `“${q.keyword}”` });
    if (q.provinceId)
      chips.push({
        key: 'provinceId',
        label: this.provinces().find((p) => p.id === q.provinceId)?.name || 'Tỉnh/thành đã chọn',
      });
    if (q.wardId)
      chips.push({
        key: 'wardId',
        label: this.wards().find((w) => w.id === q.wardId)?.name || 'Phường/xã đã chọn',
      });
    if (q.rentalMode)
      chips.push({
        key: 'rentalMode',
        label: q.rentalMode === 'WHOLE' ? 'Nguyên căn' : 'Thuê từng phòng',
      });
    if (q.propertyTypeId)
      chips.push({
        key: 'propertyTypeId',
        label:
          this.propertyTypes().find((t) => t.id === q.propertyTypeId)?.name || 'Loại cơ sở đã chọn',
      });
    if (q.roomTypeName) chips.push({ key: 'roomTypeName', label: q.roomTypeName });
    const range = (min: number | undefined, max: number | undefined, unit: string) =>
      `${min != null ? min.toLocaleString('vi-VN') : '0'} – ${max != null ? max.toLocaleString('vi-VN') : 'không giới hạn'} ${unit}`;
    if (q.minPrice != null || q.maxPrice != null)
      chips.push({ key: 'price', label: range(q.minPrice, q.maxPrice, 'đ/tháng') });
    if (q.minArea != null || q.maxArea != null)
      chips.push({ key: 'area', label: range(q.minArea, q.maxArea, 'm²') });
    if (q.minFloor != null || q.maxFloor != null)
      chips.push({ key: 'floor', label: 'Tầng ' + range(q.minFloor, q.maxFloor, '') });
    if (q.minOccupants)
      chips.push({ key: 'minOccupants', label: `Ở được từ ${q.minOccupants} người` });
    for (const field of this.feeFields) {
      const value = q[field.key as keyof RoomQueryParams];
      if (typeof value === 'number')
        chips.push({ key: field.key, label: `${field.label}: ${value.toLocaleString('vi-VN')}` });
    }
    for (const name of q.amenityNames || []) chips.push({ key: `amenity:${name}`, label: name });
    if (q.radiusKm)
      chips.push({
        key: 'location',
        label: `${this.placeName() || 'Địa điểm đã chọn'} · ${q.radiusKm} km`,
      });
    if (q.south != null) chips.push({ key: 'location', label: 'Trong khung bản đồ' });
    return chips;
  });

  constructor() {
    this.wardRequests
      .pipe(
        switchMap((id) => {
          this.wardProvince = id;
          this.wards.set([]);
          this.wardError.set('');
          this.wardsLoading.set(!!id);
          return (id ? this.addresses.getAllWards(id) : of([])).pipe(
            catchError(() => {
              this.wardError.set('Chưa tải được phường/xã. Vui lòng thử lại.');
              return of([]);
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
    combineLatest([this.route.queryParamMap, this.refresh.pipe(startWith(null))])
      .pipe(
        map(([params]) => ({
          query: this.parse(params),
          view: params.get('view') === 'map' ? ('map' as const) : ('list' as const),
        })),
        switchMap(({ query, view }) => {
          this.query.set(query);
          this.view.set(view);
          this.form.reset(undefined, { emitEvent: false });
          this.form.patchValue(query, { emitEvent: false });
          if ((query.provinceId || '') !== this.wardProvince)
            this.wardRequests.next(query.provinceId || '');
          this.formError.set('');
          this.error.set('');
          this.mapError.set('');
          this.result.set(null);
          if (view !== 'map') this.mapListings.set(null);
          if (
            this.form.invalid ||
            Object.values(query).some(
              (value) => typeof value === 'number' && !Number.isFinite(value),
            )
          ) {
            this.formError.set(
              'Bộ lọc không hợp lệ. Kiểm tra số tiền, diện tích, tầng và phạm vi vị trí.',
            );
            return of(null);
          }
          this.loading.set(true);
          return forkJoin({
            result: this.api.search(query),
            mapItems:
              view === 'map'
                ? this.api.searchMap(query).pipe(
                    catchError(() => {
                      this.mapError.set('Không tải được điểm trên bản đồ.');
                      return of(null);
                    }),
                  )
                : of(null),
          }).pipe(
            catchError((error) => {
              if (error.error?.errorCode === 'FEED_SESSION_EXPIRED') {
                void this.navigate({ ...query, page: 0, rankingSession: undefined }, true);
              } else
                this.error.set(error.error?.message || 'Không thể tải kết quả. Vui lòng thử lại.');
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((response) => {
        if (response) {
          this.result.set(response.result);
          this.mapListings.set(response.mapItems);
          if (this.view() === 'map' && !this.mapCenter()) {
            const item = response.mapItems?.[0];
            const latitude = this.query().latitude ?? item?.property.latitude;
            const longitude = this.query().longitude ?? item?.property.longitude;
            if (latitude != null && longitude != null) this.mapCenter.set({ latitude, longitude });
          }
        }
      });
  }
  loadOptions(): void {
    this.optionError.set('');
    const fallback = <T>() => {
      this.optionError.set(
        'Một số lựa chọn chưa tải được. Bạn có thể thử lại hoặc tiếp tục tìm kiếm.',
      );
      return of([] as T[]);
    };
    forkJoin({
      provinces: this.addresses.getProvinces().pipe(catchError(() => fallback<Province>())),
      amenities: this.amenitiesApi.getAllAmenities().pipe(catchError(() => fallback<Amenity>())),
      types: this.roomTypesApi.getAllRoomTypes().pipe(catchError(() => fallback<RoomType>())),
      propertyTypes: this.propertyTypesApi
        .getAll()
        .pipe(catchError(() => fallback<PropertyType>())),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((data) => {
        this.provinces.set(data.provinces);
        this.amenities.set(data.amenities);
        this.types.set(data.types);
        this.propertyTypes.set(data.propertyTypes);
      });
  }
  retryWards(): void {
    this.wardRequests.next(this.form.controls.provinceId.value);
  }
  apply(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError.set(
        'Giá trị phải hợp lệ và mức tối thiểu không được lớn hơn tối đa. Điền đủ địa điểm khi lọc bán kính.',
      );
      return;
    }
    this.formError.set('');
    this.filtersOpen.set(false);
    const raw = this.form.getRawValue();
    const values = Object.fromEntries(
      Object.entries(raw).filter(([, value]) => value !== '' && value != null),
    );
    if (raw.latitude == null && this.query().south != null) {
      const { south, north, west, east } = this.query();
      Object.assign(values, { south, north, west, east });
    }
    void this.navigate({
      ...values,
      keyword: raw.keyword.trim() || undefined,
      sort: this.query().sort,
      rentalStatus: RoomRentalStatus.AVAILABLE,
      page: 0,
      size: 12,
    } as RoomQueryParams);
  }
  clear(): void {
    this.placeName.set('');
    this.filtersOpen.set(false);
    void this.navigate({
      page: 0,
      size: 12,
      rentalStatus: RoomRentalStatus.AVAILABLE,
      sort: 'recommended',
    });
  }
  removeChip(key: string): void {
    const q = { ...this.query(), page: 0, rankingSession: undefined };
    const keys =
      key === 'price'
        ? ['minPrice', 'maxPrice']
        : key === 'area'
          ? ['minArea', 'maxArea']
          : key === 'floor'
            ? ['minFloor', 'maxFloor']
            : key === 'location'
              ? ['latitude', 'longitude', 'radiusKm', 'south', 'north', 'west', 'east']
              : key === 'provinceId'
                ? ['provinceId', 'wardId']
                : [key];
    if (key.startsWith('amenity:'))
      q.amenityNames = (q.amenityNames || []).filter((name) => name !== key.slice(8));
    else for (const field of keys) delete (q as Record<string, unknown>)[field];
    void this.navigate(q);
  }
  toggleAmenity(name: string, selected: boolean): void {
    const values = new Set(this.form.controls.amenityNames.value);
    selected ? values.add(name) : values.delete(name);
    this.form.controls.amenityNames.setValue([...values]);
  }
  setPrice(min: number | null, max: number | null): void {
    this.form.patchValue({ minPrice: min, maxPrice: max });
  }
  setArea(min: number | null, max: number | null): void {
    this.form.patchValue({ minArea: min, maxArea: max });
  }
  selectPlace(place: MapPlace): void {
    this.placeName.set(place.name);
    this.form.patchValue({
      latitude: place.latitude,
      longitude: place.longitude,
      radiusKm: this.form.controls.radiusKm.value || 3,
    });
  }
  clearPlace(): void {
    this.placeName.set('');
    this.form.patchValue({ latitude: null, longitude: null, radiusKm: null });
  }
  async locate(): Promise<void> {
    if (this.locating()) return;
    this.locating.set(true);
    this.locationError.set('');
    try {
      const p = await this.geolocation.locate();
      if (!this.destroy.destroyed) {
        this.placeName.set('Vị trí của tôi');
        this.form.patchValue({
          latitude: p.latitude,
          longitude: p.longitude,
          radiusKm: this.form.controls.radiusKm.value || 3,
        });
      }
    } catch {
      this.locationError.set('Chưa lấy được vị trí. Bạn có thể tìm địa điểm ở trên.');
    } finally {
      this.locating.set(false);
    }
  }
  setView(view: 'list' | 'map'): void {
    if (view === this.view()) return;
    void this.navigate(this.query(), false, view);
  }
  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
    if (this.filtersOpen())
      requestAnimationFrame(() => {
        if (!this.destroy.destroyed)
          document.getElementById('search-filters')?.scrollIntoView({ block: 'start' });
      });
  }
  setSort(sort: string): void {
    void this.navigate({
      ...this.query(),
      sort: sort as RoomQueryParams['sort'],
      page: 0,
      rankingSession: undefined,
    });
  }
  pageChange(page: number): void {
    if (this.loading()) return;
    void this.navigate({ ...this.query(), page, rankingSession: this.result()?.rankingSession });
  }
  setLocation(filter: LocationFilter | null): void {
    const q = {
      ...this.query(),
      page: 0,
      rankingSession: undefined,
      latitude: undefined,
      longitude: undefined,
      radiusKm: undefined,
      south: undefined,
      north: undefined,
      west: undefined,
      east: undefined,
    };
    if (filter?.kind === 'radius')
      Object.assign(q, {
        latitude: filter.latitude,
        longitude: filter.longitude,
        radiusKm: filter.radiusKm,
      });
    if (filter?.kind === 'bounds')
      Object.assign(q, {
        south: filter.south,
        north: filter.north,
        west: filter.west,
        east: filter.east,
      });
    const geoKeys = [
      'latitude',
      'longitude',
      'radiusKm',
      'south',
      'north',
      'west',
      'east',
    ] as const;
    if (geoKeys.every((key) => q[key] === this.query()[key])) return;
    void this.navigate(q);
  }
  openRoom(room: PublicListing): void {
    void this.router.navigate(['/tro', room.listingId]);
  }
  retry(): void {
    this.refresh.next();
  }
  private navigate(query: RoomQueryParams, replaceUrl = false, view = this.view()) {
    const options = {
      queryParams: { ...query, view: view === 'map' ? 'map' : undefined },
      replaceUrl,
    };
    if (
      this.router.serializeUrl(this.router.createUrlTree(['/tim-phong'], options)) ===
      this.router.url
    ) {
      this.refresh.next();
      return Promise.resolve(true);
    }
    return this.router.navigate(['/tim-phong'], options);
  }
  private parse(params: ParamMap): RoomQueryParams {
    const query: RoomQueryParams = {
      page: Math.max(0, Math.trunc(Number(params.get('page')) || 0)),
      size: 12,
      rentalStatus: RoomRentalStatus.AVAILABLE,
      sort: this.sorts.some((s) => s.value === params.get('sort'))
        ? (params.get('sort') as RoomQueryParams['sort'])
        : 'recommended',
    };
    for (const key of [
      'keyword',
      'provinceId',
      'wardId',
      'roomTypeName',
      'propertyTypeId',
      'rankingSession',
    ] as const) {
      const value = params.get(key)?.trim();
      if (value) query[key] = value;
    }
    const mode = params.get('rentalMode');
    if (mode === 'WHOLE' || mode === 'BY_ROOM') query.rentalMode = mode;
    for (const key of [
      'minPrice',
      'maxPrice',
      'minArea',
      'maxArea',
      'minOccupants',
      'minFloor',
      'maxFloor',
      'maxDeposit',
      'maxElectricityPrice',
      'maxWaterPrice',
      'maxServiceFee',
      'latitude',
      'longitude',
      'radiusKm',
      'south',
      'north',
      'west',
      'east',
    ] as const) {
      const value = params.get(key);
      if (value != null && value.trim()) query[key] = Number(value);
    }
    const amenities = [...new Set(params.getAll('amenityNames').filter(Boolean))];
    if (amenities.length) query.amenityNames = amenities;
    return query;
  }
}
