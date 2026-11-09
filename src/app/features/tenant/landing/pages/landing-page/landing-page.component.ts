import {
  ChangeDetectionStrategy,
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { PublicListingService } from '@services/listing/public-listing.service';
import {
  PublicListing,
  PublicListingList,
  ListingPriceStatistics,
} from '@model/public-listing/public-listing.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, map, of, switchMap } from 'rxjs';
import { AddressService } from '@services/address/address.service';
import { Province } from '@model/address/province.model';
import { Ward } from '@model/address/ward.model';
import { Router, RouterLink } from '@angular/router';
import { RoomRentalStatus } from '@model/room/room.model';
import { SearchCapsuleComponent } from '../../components/search-capsule/search-capsule.component';
import { RoomGridComponent } from '../../components/room-grid/room-grid.component';
import { LandlordCtaComponent } from '../../components/landlord-cta/landlord-cta.component';
import { AiRecommendationComponent } from '../../components/ai-recommendation/ai-recommendation.component';
import { ListingMapComponent } from '../../components/listing-map/listing-map.component';
import { Coordinates, LocationFilter, MapPin, MapPlace } from '@model/maps/maps.model';
import { GeolocationService } from '@services/maps/geolocation.service';
import { MapCanvasComponent } from '@shared/components/map-canvas/map-canvas.component';
import { MapPlaceSearchComponent } from '@shared/components/map-place-search/map-place-search.component';
import { DOCUMENT, DecimalPipe } from '@angular/common';
import { LocationUtils } from '@shared/utils/location-utils';

/** Public landing page using published listings and the existing rental flows. */
@Component({
  selector: 'app-landing-page',
  imports: [
    SearchCapsuleComponent,
    RoomGridComponent,
    LandlordCtaComponent,
    AiRecommendationComponent,
    ListingMapComponent,
    MapCanvasComponent,
    MapPlaceSearchComponent,
    RouterLink,
    DecimalPipe,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements OnInit {
  private readonly listingService = inject(PublicListingService);
  private readonly geolocation = inject(GeolocationService);
  private readonly addresses = inject(AddressService);
  private readonly statisticsRequests = new Subject<{ provinceId: string; wardId: string }>();
  private readonly wardRequests = new Subject<string>();
  readonly statistics = signal<ListingPriceStatistics[]>([]);
  readonly statisticsProvince = signal('');
  readonly statisticsWard = signal('');
  readonly statisticsLoading = signal(false);
  readonly statisticsError = signal('');
  readonly statisticsProvinces = signal<Province[]>([]);
  readonly statisticsWards = signal<Ward[]>([]);
  readonly statisticsWardsLoading = signal(false);
  readonly provinceError = signal('');
  readonly wardError = signal('');
  readonly statisticsRoomCount = computed(() =>
    this.statistics().reduce((sum, row) => sum + row.roomCount, 0),
  );
  private readonly mapRequests = new Subject<RoomQueryParams>();
  readonly mapListings = signal<PublicListing[] | null>(null);
  readonly mapLoading = signal(false);
  readonly mapError = signal('');
  readonly userPosition = signal<Coordinates | null>(null);
  readonly locating = signal(false);
  readonly locationError = signal('');
  readonly locationRevision = signal(0);
  private locationRequest = 0;
  private readonly destroy = inject(DestroyRef);
  private readonly requests = new Subject<{ page: number; append: boolean }>();
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly heroImages = ['landing_1.png', 'landing_2.png', 'landing_3.png'];
  readonly heroSlides = [...this.heroImages, this.heroImages[0]];
  readonly heroImageIndex = signal(0);
  readonly heroSlideResetting = signal(false);
  readonly priceAnimationReady = signal(false);

  constructor() {
    afterNextRender(() => {
      const window = this.document.defaultView;
      if (!window) return;
      void this.locate();
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      const root = this.document.documentElement;
      root.classList.add('landing-scroll-snap');
      const stopSectionScroll = this.setupSectionScroll(window);

      let slideResetTimer = 0;
      let slideResumeTimer = 0;
      const slideshow = window.setInterval(() => {
        if (!this.document.hidden && !reducedMotion?.matches) {
          this.heroImageIndex.update((index) => index + 1);
          // The final slide repeats the first image, allowing a seamless forward loop.
          if (this.heroImageIndex() === this.heroImages.length) {
            slideResetTimer = window.setTimeout(() => {
              this.heroSlideResetting.set(true);
              this.heroImageIndex.set(0);
              slideResumeTimer = window.setTimeout(() => this.heroSlideResetting.set(false), 50);
            }, 900);
          }
        }
      }, 5000);

      const chart = this.host.nativeElement.querySelector('.price-bars');
      let observer: IntersectionObserver | undefined;
      if (chart && typeof IntersectionObserver !== 'undefined' && !reducedMotion?.matches) {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              this.priceAnimationReady.set(true);
              observer?.disconnect();
            }
          },
          { threshold: 0.01, rootMargin: '0px 0px 140px 0px' },
        );
        observer.observe(chart);
      } else {
        this.priceAnimationReady.set(true);
      }

      this.destroy.onDestroy(() => {
        window.clearInterval(slideshow);
        window.clearTimeout(slideResetTimer);
        window.clearTimeout(slideResumeTimer);
        observer?.disconnect();
        stopSectionScroll();
        root.classList.remove('landing-scroll-snap');
      });
    });
  }
  private setupSectionScroll(window: Window): () => void {
    let previousY = window.scrollY;
    let direction = 0;
    let settleTimer = 0;
    let frame = 0;
    let cooldownUntil = 0;
    const cancel = () => {
      window.clearTimeout(settleTimer);
      window.cancelAnimationFrame(frame);
      frame = 0;
      cooldownUntil = window.performance.now() + 250;
    };
    const snap = () => {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      if (frame) return;
      if (window.performance.now() < cooldownUntil) {
        settleTimer = window.setTimeout(snap, cooldownUntil - window.performance.now() + 16);
        return;
      }
      const focused = this.document.activeElement;
      if (focused?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const header = 80;
      const threshold = Math.min(420, window.innerHeight * 0.52);
      const sections = [
        ...this.host.nativeElement.querySelectorAll<HTMLElement>('.landing > section'),
      ];
      const target = sections.find((section) => {
        const distance = section.getBoundingClientRect().top - header;
        return direction > 0
          ? distance > 12 && distance <= threshold
          : direction < 0 && distance < -12 && distance >= -threshold;
      });
      if (!target) return;
      const from = window.scrollY;
      const max = Math.max(0, this.document.documentElement.scrollHeight - window.innerHeight);
      const to = Math.min(max, Math.max(0, from + target.getBoundingClientRect().top - header));
      if (Math.abs(to - from) < 12) return;
      const started = window.performance.now();
      const duration = 620;
      const animate = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        window.scrollTo({ top: from + (to - from) * eased, behavior: 'instant' });
        previousY = window.scrollY;
        if (progress < 1) frame = window.requestAnimationFrame(animate);
        else {
          frame = 0;
          cooldownUntil = now + 300;
        }
      };
      frame = window.requestAnimationFrame(animate);
    };
    const onScroll = () => {
      const delta = window.scrollY - previousY;
      previousY = window.scrollY;
      if (frame || Math.abs(delta) < 1) return;
      direction = Math.sign(delta);
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(snap, 70);
    };
    const onWheel = (event: WheelEvent) => {
      if (frame && !event.ctrlKey) event.preventDefault();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', cancel, { passive: true });
    window.addEventListener('keydown', cancel);
    return () => {
      cancel();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', cancel);
      window.removeEventListener('keydown', cancel);
    };
  }
  readonly rooms = signal<PublicListingList | null>(null);
  readonly searchError = signal('');
  readonly searching = signal(false);
  readonly view = signal<'list' | 'map'>('list');
  readonly locationLabels = signal({ province: '', ward: '' });
  readonly nearbyPlace = signal('');
  readonly mapPins = computed<MapPin[]>(() =>
    (this.mapListings() ?? this.rooms()?.items ?? [])
      .filter(
        (item) => LocationUtils.point(item.property?.latitude, item.property?.longitude) !== null,
      )
      .map((item) => ({
        id: item.listingId,
        title: item.listingTitle,
        latitude: item.property.latitude!,
        longitude: item.property.longitude!,
        label: item.price > 0 ? `${this.millions(item.price)} Tr` : 'Liên hệ',
        address: item.fullAddress,
      })),
  );
  readonly priceInsights = computed(() => {
    const rows = this.statistics()
      .filter((row) => row.averagePrice > 0)
      .map((row) => ({
        id: row.areaId,
        name: row.areaName,
        average: row.averagePrice,
        count: row.roomCount,
      }));
    const max = Math.max(...rows.map((row) => row.average), 1);
    return rows.map((row) => ({ ...row, width: (row.average / max) * 100 }));
  });
  readonly lowestPrice = computed(() => {
    const prices = (this.rooms()?.items ?? [])
      .map((item) => item.price)
      .filter((price) => price > 0);
    return prices.length ? Math.min(...prices) : null;
  });
  readonly rentalSteps = [
    {
      icon: 'travel_explore',
      title: 'Tìm phòng phù hợp',
      text: 'Lọc theo khu vực, ngân sách và tiện ích. Xem vị trí thực tế ngay trên bản đồ.',
    },
    {
      icon: 'forum',
      title: 'Kết nối trực tiếp chủ trọ',
      text: 'Xem thông tin tin đăng, trao đổi với chủ trọ và hẹn xem phòng trước khi quyết định.',
    },
    {
      icon: 'description',
      title: 'Thỏa thuận thuê rõ ràng',
      text: 'Kiểm tra giá thuê, tiền cọc và điều khoản. Gửi yêu cầu thuê tại trang chi tiết phòng.',
    },
    {
      icon: 'key',
      title: 'Theo dõi và nhận phòng',
      text: 'Theo dõi yêu cầu thuê và hợp đồng trong tài khoản, thống nhất thời gian nhận phòng với chủ trọ.',
    },
  ];

  millions(value: number): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1000000);
  }

  scrollTo(id: string): void {
    this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showMap(): void {
    this.view.set('map');
    this.scrollTo('rental-results');
  }

  selectPlace(place: MapPlace): void {
    this.locationRequest++;
    this.nearbyPlace.set(place.name);
    this.activeQuery.update((query) => ({ ...query, provinceId: undefined, wardId: undefined }));
    this.applyLocationFilter({
      kind: 'radius',
      latitude: place.latitude,
      longitude: place.longitude,
      radiusKm: 3,
    });
    this.scrollTo('rental-results');
  }

  openPin(id: string): void {
    const listing = (this.mapListings() ?? this.rooms()?.items ?? []).find(
      (item) => item.listingId === id,
    );
    if (listing) this.openRoom(listing);
  }
  readonly activeQuery = signal<RoomQueryParams>({
    page: 0,
    size: 12,
    rentalStatus: RoomRentalStatus.AVAILABLE,
  });
  readonly mapCenter = computed(() => {
    const query = this.activeQuery();
    if (query.provinceId || query.wardId) return this.mapPins()[0] ?? this.userPosition();
    return (
      LocationUtils.point(query.latitude, query.longitude) ??
      this.userPosition() ??
      this.mapPins()[0] ??
      null
    );
  });
  async locate(): Promise<void> {
    if (this.locating()) return;
    const request = ++this.locationRequest;
    this.locating.set(true);
    this.locationError.set('');
    try {
      const position = await this.geolocation.locate();
      if (this.destroy.destroyed || request !== this.locationRequest) return;
      this.userPosition.set(position);
      this.locationRevision.update((value) => value + 1);
      if (
        this.activeQuery().provinceId ||
        this.activeQuery().wardId ||
        this.activeQuery().latitude != null ||
        this.activeQuery().south != null
      ) {
        this.activeQuery.update((query) => ({
          ...query,
          provinceId: undefined,
          wardId: undefined,
        }));
        this.applyLocationFilter(null);
      }
    } catch (error) {
      if (!this.destroy.destroyed && request === this.locationRequest)
        this.locationError.set((error as Error).message);
    } finally {
      if (!this.destroy.destroyed) this.locating.set(false);
    }
  }
  onMapLocated(position: Coordinates): void {
    this.userPosition.set(position);
    this.locationRevision.update((value) => value + 1);
    this.activeQuery.update((query) => ({ ...query, provinceId: undefined, wardId: undefined }));
  }
  readonly filterChips = computed(() => {
    const query = this.activeQuery();
    const chips: { key: string; label: string }[] = [];
    if (query.provinceId)
      chips.push({
        key: 'province',
        label: this.locationLabels().province || 'Tỉnh / thành phố đã chọn',
      });
    if (query.wardId)
      chips.push({ key: 'ward', label: this.locationLabels().ward || 'Phường / xã đã chọn' });
    if (query.roomTypeName) chips.push({ key: 'type', label: query.roomTypeName });
    if (query.minPrice != null || query.maxPrice != null) {
      const format = (value: number) => new Intl.NumberFormat('vi-VN').format(value / 1000000);
      const label =
        query.minPrice == null
          ? `Dưới ${format(query.maxPrice!)} triệu`
          : query.maxPrice == null
            ? `Trên ${format(query.minPrice)} triệu`
            : `${format(query.minPrice)} – ${format(query.maxPrice)} triệu`;
      chips.push({ key: 'price', label });
    }
    for (const name of query.amenityNames ?? [])
      chips.push({ key: `amenity:${name}`, label: name });
    if (query.radiusKm != null)
      chips.push({
        key: 'map',
        label: `${this.nearbyPlace() ? this.nearbyPlace() + ' · ' : ''}Trong bán kính ${query.radiusKm} km`,
      });
    else if (query.south != null) chips.push({ key: 'map', label: 'Trong khung bản đồ' });
    return chips;
  });

  ngOnInit(): void {
    this.loadStatisticsProvinces();
    this.wardRequests
      .pipe(
        switchMap((provinceId) => {
          this.statisticsWardsLoading.set(!!provinceId);
          this.wardError.set('');
          return (provinceId ? this.addresses.getAllWards(provinceId) : of([] as Ward[])).pipe(
            catchError(() => {
              this.wardError.set('Chưa tải được phường/xã.');
              return of([] as Ward[]);
            }),
            finalize(() => this.statisticsWardsLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((wards) => this.statisticsWards.set(wards));
    this.statisticsRequests
      .pipe(
        switchMap(({ provinceId, wardId }) => {
          this.statistics.set([]);
          this.statisticsLoading.set(true);
          this.statisticsError.set('');
          return this.listingService.priceStatistics(provinceId, wardId).pipe(
            catchError(() => {
              this.statisticsError.set('Không tải được thống kê giá. Vui lòng thử lại.');
              return of([] as ListingPriceStatistics[]);
            }),
            finalize(() => this.statisticsLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((rows) => this.statistics.set(rows));
    this.reloadStatistics();
    this.mapRequests
      .pipe(
        switchMap((query) => {
          this.mapLoading.set(true);
          this.mapError.set('');
          return this.listingService.searchMap(query).pipe(
            catchError(() => {
              this.mapListings.set([]);
              this.mapError.set('Không tải được ghim tin đăng. Vui lòng thử lại.');
              return EMPTY;
            }),
            finalize(() => this.mapLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((items) => this.mapListings.set(items));
    this.requests
      .pipe(
        switchMap(({ page, append }) => {
          this.searching.set(true);
          this.searchError.set('');
          if (!append) this.rooms.set(null);
          return this.listingService.search({ ...this.activeQuery(), page }).pipe(
            map((result) => ({ result, append })),
            catchError((err) => {
              this.searchError.set(
                err?.error?.message || 'Không tải được tin đăng. Vui lòng thử lại.',
              );
              return EMPTY;
            }),
            finalize(() => this.searching.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(({ result, append }) => {
        this.rooms.set(
          append ? { ...result, items: [...(this.rooms()?.items ?? []), ...result.items] } : result,
        );
      });
    this.loadRooms();
  }

  searchRooms(query: RoomQueryParams): void {
    if (
      query.provinceId !== this.activeQuery().provinceId ||
      query.wardId !== this.activeQuery().wardId
    ) {
      this.locationRequest++;
      this.nearbyPlace.set('');
      query = {
        ...query,
        latitude: undefined,
        longitude: undefined,
        radiusKm: undefined,
        south: undefined,
        north: undefined,
        west: undefined,
        east: undefined,
      };
    }
    this.activeQuery.update((current) => ({
      ...current,
      ...query,
      page: 0,
      size: current.size ?? 12,
    }));
    this.loadRooms();
  }

  updateFilters(filters: RoomQueryParams): void {
    this.activeQuery.update((current) => ({ ...current, ...filters, page: 0 }));
    this.loadRooms();
  }

  selectRoomType(roomTypeName: string): void {
    this.updateFilters({ roomTypeName });
  }

  removeFilter(key: string): void {
    switch (key) {
      case 'map':
        this.applyLocationFilter(null);
        break;
      case 'province':
        this.updateFilters({ provinceId: undefined, wardId: undefined });
        break;
      case 'ward':
        this.updateFilters({ wardId: undefined });
        break;
      case 'type':
        this.updateFilters({ roomTypeName: undefined });
        break;
      case 'price':
        this.updateFilters({ minPrice: undefined, maxPrice: undefined });
        break;
      default:
        this.updateFilters({
          amenityNames: (this.activeQuery().amenityNames ?? []).filter(
            (name) => `amenity:${name}` !== key,
          ),
        });
    }
  }

  resetFilters(): void {
    this.nearbyPlace.set('');
    this.activeQuery.set({ page: 0, size: 12, rentalStatus: RoomRentalStatus.AVAILABLE });
    this.loadRooms();
  }
  applyLocationFilter(filter: LocationFilter | null): void {
    if (!filter) this.nearbyPlace.set('');
    const location: RoomQueryParams = {
      latitude: undefined,
      longitude: undefined,
      radiusKm: undefined,
      south: undefined,
      north: undefined,
      west: undefined,
      east: undefined,
    };
    if (filter?.kind === 'radius')
      Object.assign(location, {
        latitude: filter.latitude,
        longitude: filter.longitude,
        radiusKm: filter.radiusKm,
      });
    else if (filter?.kind === 'bounds')
      Object.assign(location, {
        south: filter.south,
        north: filter.north,
        west: filter.west,
        east: filter.east,
      });
    this.updateFilters(location);
  }
  loadMapPage(page: number): void {
    this.requests.next({ page, append: false });
  }

  openRoom(listing: PublicListing): void {
    void this.router.navigate(['/tro', listing.listingId]);
  }
  loadMore(): void {
    const current = this.rooms();
    if (!current || current.page + 1 >= current.totalPages || this.searching()) return;
    this.requests.next({ page: current.page + 1, append: true });
  }
  private loadRooms(): void {
    this.requests.next({ page: 0, append: false });
    this.reloadMap();
  }
  reloadMap(): void {
    this.mapRequests.next(this.activeQuery());
  }
  loadStatisticsProvinces(): void {
    this.provinceError.set('');
    this.addresses
      .getProvinces()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (provinces) => this.statisticsProvinces.set(provinces),
        error: () => this.provinceError.set('Chưa tải được tỉnh/thành phố.'),
      });
  }
  changeStatisticsProvince(id: string): void {
    this.statisticsProvince.set(id);
    this.statisticsWard.set('');
    this.statisticsWards.set([]);
    this.wardRequests.next(id);
    this.reloadStatistics();
  }
  changeStatisticsWard(id: string): void {
    this.statisticsWard.set(id);
    this.reloadStatistics();
  }
  reloadStatistics(): void {
    this.statisticsRequests.next({
      provinceId: this.statisticsProvince(),
      wardId: this.statisticsWard(),
    });
  }
}
