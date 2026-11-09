import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Coordinates, LocationFilter, MapBounds, MapPin, MapPlace } from '@model/maps/maps.model';
import { PublicListing, PublicListingList } from '@model/public-listing/public-listing.model';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { GeolocationService } from '@services/maps/geolocation.service';
import { MapCanvasComponent } from '@shared/components/map-canvas/map-canvas.component';
import { MapPlaceSearchComponent } from '@shared/components/map-place-search/map-place-search.component';
import { BillingPagerComponent } from '@shared/components/billing-pager/billing-pager.component';
import { LocationUtils } from '@shared/utils/location-utils';
import { ImageUtils } from '@shared/utils/image-utils';
import { TextUtils } from '@shared/utils/text-utils';

@Component({
  selector: 'app-listing-map',
  imports: [FormsModule, MapCanvasComponent, MapPlaceSearchComponent, BillingPagerComponent],
  templateUrl: './listing-map.component.html',
  styleUrl: './listing-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingMapComponent implements OnInit, OnChanges {
  private readonly geolocation = inject(GeolocationService);
  private readonly destroy = inject(DestroyRef);
  private readonly viewportRequests = new Subject<MapBounds>();
  private bounds: MapBounds | null = null;
  private locationRequest = 0;
  private expectedClear = false;
  @Input() result: PublicListingList | null = null;
  @Input() mapItems: PublicListing[] | null = null;
  @Input() initialCenter: Coordinates | null = null;
  @Input() locationRevision = 0;
  @Input() mapLoading = false;
  @Input() mapError = '';
  @Input() query: RoomQueryParams = {};
  @Input() loading = false;
  @Output() readonly locationFilter = new EventEmitter<LocationFilter | null>();
  @Output() readonly listingSelected = new EventEmitter<PublicListing>();
  @Output() readonly pageChange = new EventEmitter<number>();
  @Output() readonly userLocated = new EventEmitter<Coordinates>();
  readonly mode = signal<'viewport' | 'radius' | 'off'>('viewport');
  readonly center = signal<Coordinates | null>(null);
  readonly userPosition = signal<Coordinates | null>(null);
  readonly radius = signal(3);
  readonly centerLabel = signal('');
  readonly locating = signal(false);
  readonly centerRevision = signal(0);
  readonly error = signal('');
  readonly images = ImageUtils;
  readonly money = TextUtils.toVnd;

  ngOnInit(): void {
    this.viewportRequests
      .pipe(
        debounceTime(450),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((bounds) => {
        if (this.mode() === 'viewport') this.locationFilter.emit({ kind: 'bounds', ...bounds });
      });
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialCenter']) this.userPosition.set(this.initialCenter);
    if (changes['initialCenter'] && this.initialCenter && this.query.radiusKm == null) {
      this.center.set(this.initialCenter);
    }
    if (!changes['query']) return;
    const query = this.query;
    if (query.radiusKm == null && query.south == null && this.expectedClear) {
      this.expectedClear = false;
      return;
    }
    this.expectedClear = false;
    if (query.radiusKm != null) {
      this.mode.set('radius');
      this.radius.set(query.radiusKm);
      this.center.set(LocationUtils.point(query.latitude, query.longitude));
    } else if (query.south != null) this.mode.set('viewport');
    else if (
      changes['query'].previousValue?.radiusKm != null ||
      changes['query'].previousValue?.south != null
    ) {
      this.mode.set(this.initialCenter ? 'viewport' : 'off');
      this.center.set(this.initialCenter);
      this.centerLabel.set('');
    }
  }
  pins(): MapPin[] {
    const pins: MapPin[] = [];
    for (const listing of this.mapItems ?? this.result?.items ?? []) {
      const point = LocationUtils.point(listing.property.latitude, listing.property.longitude);
      if (point)
        pins.push({
          ...point,
          id: listing.id,
          title: listing.listingTitle,
          address: listing.fullAddress,
          label: listing.price ? this.money(listing.price) : 'Liên hệ',
          image: this.images.toImageSrc(listing.thumbnail),
        });
    }
    const center = this.center();
    if (center && this.mode() === 'radius')
      pins.push({ ...center, id: 'location', title: 'Tâm tìm kiếm', label: 'Tâm tìm kiếm' });
    return pins;
  }
  missingPins(): number {
    return (this.result?.items ?? []).filter(
      (listing) => !LocationUtils.point(listing.property.latitude, listing.property.longitude),
    ).length;
  }
  boundsChanged(bounds: MapBounds): void {
    this.bounds = Object.fromEntries(
      Object.entries(bounds).map(([key, value]) => [key, Number(value.toFixed(6))]),
    ) as unknown as MapBounds;
    if (this.mode() === 'viewport') this.viewportRequests.next(this.bounds);
  }
  changeMode(mode: 'viewport' | 'radius' | 'off'): void {
    this.locationRequest++;
    this.mode.set(mode);
    this.error.set('');
    if (mode === 'off') this.clearFilter();
    else if (mode === 'viewport') {
      if (this.bounds) this.locationFilter.emit({ kind: 'bounds', ...this.bounds });
      else this.clearFilter();
    } else if (this.center()) this.emitRadius();
    else this.clearFilter();
  }
  private clearFilter(): void {
    this.expectedClear = true;
    this.locationFilter.emit(null);
  }
  selectPlace(place: MapPlace): void {
    this.locationRequest++;
    this.centerLabel.set(place.name || place.address);
    this.center.set({ latitude: place.latitude, longitude: place.longitude });
    this.mode.set('radius');
    this.error.set('');
    this.emitRadius();
  }
  radiusChanged(value: number): void {
    if (!Number.isFinite(value) || value <= 0) return;
    this.radius.set(value);
    if (this.mode() === 'radius' && this.center()) this.emitRadius();
  }
  private emitRadius(): void {
    const point = this.center();
    if (point) this.locationFilter.emit({ kind: 'radius', ...point, radiusKm: this.radius() });
  }
  async locate(): Promise<void> {
    if (this.locating()) return;
    const request = ++this.locationRequest;
    this.locating.set(true);
    this.error.set('');
    try {
      const point = await this.geolocation.locate();
      if (this.destroy.destroyed || request !== this.locationRequest) return;
      this.center.set(point);
      this.userPosition.set(point);
      this.centerLabel.set('Vị trí của bạn');
      this.centerRevision.update((value) => value + 1);
      this.mode.set('viewport');
      this.userLocated.emit(point);
      this.clearFilter();
    } catch (error) {
      if (!this.destroy.destroyed && request === this.locationRequest)
        this.error.set((error as Error).message);
    } finally {
      if (!this.destroy.destroyed) this.locating.set(false);
    }
  }
  openPin(id: string): void {
    const listing = (this.mapItems ?? this.result?.items ?? []).find((item) => item.id === id);
    if (listing) this.listingSelected.emit(listing);
  }
}
