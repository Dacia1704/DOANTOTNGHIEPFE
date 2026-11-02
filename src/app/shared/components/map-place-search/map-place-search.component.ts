import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { GoogleMapsService } from '@services/google-maps.service';
import { MapPlace, MapsAutocomplete, PlaceSelectEvent } from '@model/maps/maps.model';
import { LocationUtils } from '@shared/utils/location-utils';

@Component({
  selector: 'app-map-place-search',
  template: `<div class="place-search">
    <div #host [attr.aria-busy]="loading()"></div>
    @if (loading()) {
      <p role="status">Đang tải tìm kiếm địa điểm…</p>
    }
    @if (error()) {
      <p role="status">{{ error() }}</p>
      <button type="button" class="btn-secondary" (click)="initialize()" [disabled]="disabled">
        Thử lại
      </button>
    }
  </div>`,
  styles: [
    `
      :host,
      .place-search {
        display: block;
        min-width: 0;
      }
      p {
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 1.7;
        margin: 8px 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPlaceSearchComponent implements AfterViewInit, OnChanges {
  private readonly maps = inject(GoogleMapsService);
  private readonly destroy = inject(DestroyRef);
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  @Input() disabled = false;
  @Input() context = '';
  @Input() includeStreetAddress = false;
  @Output() readonly placeSelected = new EventEmitter<MapPlace>();
  readonly loading = signal(false);
  readonly error = signal('');
  private widget?: MapsAutocomplete;
  private request = 0;
  private readonly selected = (event: Event) => {
    void this.select(event as PlaceSelectEvent);
  };

  constructor() {
    this.destroy.onDestroy(() => {
      this.request++;
      this.widget?.removeEventListener('gmp-select', this.selected);
      this.widget?.remove();
    });
  }
  ngAfterViewInit(): void {
    void this.initialize();
  }
  ngOnChanges(): void {
    this.request++;
    if (this.widget) this.widget.disabled = this.disabled;
  }
  async initialize(): Promise<void> {
    if (this.loading() || this.widget || this.destroy.destroyed) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const library = await this.maps.places();
      if (this.destroy.destroyed) return;
      this.widget = new library.PlaceAutocompleteElement({ includedRegionCodes: ['vn'] });
      this.widget.disabled = this.disabled;
      this.widget.setAttribute('aria-label', 'Tìm địa điểm');
      this.widget.addEventListener('gmp-select', this.selected);
      this.host.nativeElement.append(this.widget);
    } catch (error) {
      if (!this.destroy.destroyed)
        this.error.set(
          error instanceof Error ? error.message : 'Không tải được tìm kiếm địa điểm.',
        );
    } finally {
      if (!this.destroy.destroyed) this.loading.set(false);
    }
  }
  private async select(event: PlaceSelectEvent): Promise<void> {
    if (this.disabled) return;
    const request = ++this.request;
    this.error.set('');
    try {
      const place = event.placePrediction.toPlace();
      const fields = ['displayName', 'formattedAddress', 'location'];
      if (this.includeStreetAddress) fields.push('addressComponents');
      await place.fetchFields({ fields });
      if (this.destroy.destroyed || this.disabled || request !== this.request) return;
      const point = LocationUtils.point(place.location?.lat(), place.location?.lng());
      if (!point) {
        this.error.set('Địa điểm chưa có tọa độ. Hãy chọn ghim trên bản đồ.');
        return;
      }
      const result: MapPlace = {
        ...point,
        address: place.formattedAddress || '',
        name: place.displayName || '',
      };
      if (this.includeStreetAddress) {
        const component = (type: string) =>
          place.addressComponents?.find((part) => part.types.includes(type))?.longText;
        const street = [component('street_number'), component('route')].filter(Boolean).join(' ');
        if (street) result.addressLine = street;
      }
      this.placeSelected.emit(result);
    } catch {
      if (!this.destroy.destroyed && request === this.request)
        this.error.set('Không lấy được địa điểm. Hãy thử lại hoặc chọn ghim trên bản đồ.');
    }
  }
}
