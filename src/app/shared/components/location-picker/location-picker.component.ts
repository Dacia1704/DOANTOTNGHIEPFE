import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  inject,
  signal,
} from '@angular/core';
import { Coordinates, MapPin, MapPlace } from '@model/maps/maps.model';
import { GeolocationService } from '@services/geolocation.service';
import { LocationUtils } from '@shared/utils/location-utils';
import { MapCanvasComponent } from '../map-canvas/map-canvas.component';
import { MapPlaceSearchComponent } from '../map-place-search/map-place-search.component';

@Component({
  selector: 'app-location-picker',
  imports: [MapCanvasComponent, MapPlaceSearchComponent],
  template: `<section class="picker" aria-label="Chọn vị trí cơ sở">
    <h3>Vị trí trên bản đồ</h3>
    <p class="hint">
      Tìm địa điểm rồi chọn hoặc kéo ghim đến đúng cơ sở. Xác nhận tỉnh/phường và địa chỉ ở trên
      trước khi lưu.
    </p>
    <app-map-place-search
      [disabled]="disabled"
      [context]="addressContext"
      [includeStreetAddress]="true"
      (placeSelected)="selectPlace($event)"
    />
    @if (placeAddress()) {
      <p class="hint">Địa điểm Google: {{ placeAddress() }}</p>
    }
    <div class="picker-actions">
      <button
        type="button"
        class="btn-secondary"
        (click)="locate()"
        [disabled]="disabled || locating()"
      >
        {{ locating() ? 'Đang định vị…' : 'Dùng vị trí hiện tại' }}
      </button>
      <button
        type="button"
        class="btn-secondary"
        (click)="clear()"
        [disabled]="disabled || !point()"
      >
        Xóa ghim
      </button>
    </div>
    @if (error()) {
      <p class="field-error" role="alert">{{ error() }}</p>
    }
    <app-map-canvas
      [pins]="pins()"
      [center]="point()"
      [editable]="true"
      [disabled]="disabled"
      (positionChange)="select($event)"
    />
    <p class="hint" role="status">
      {{
        point()
          ? 'Đã chọn ghim: ' + latitude + ', ' + longitude
          : 'Chưa chọn ghim. Bạn vẫn có thể lưu cơ sở bằng địa chỉ.'
      }}
    </p>
  </section>`,
  styles: [
    `
      :host {
        display: block;
      }
      .picker {
        display: grid;
        gap: 12px;
        margin: 16px 0;
      }
      .picker h3 {
        margin: 0;
        font-size: 16px;
      }
      .hint {
        margin: 0;
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 1.7;
      }
      .picker-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .field-error {
        color: var(--error);
        font-size: 13px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationPickerComponent implements OnChanges {
  private readonly geolocation = inject(GeolocationService);
  private readonly destroy = inject(DestroyRef);
  @Input() latitude: number | null | undefined;
  @Input() longitude: number | null | undefined;
  @Input() disabled = false;
  @Input() addressContext = '';
  @Output() readonly locationChange = new EventEmitter<Coordinates | null>();
  @Output() readonly placeSelected = new EventEmitter<MapPlace>();
  readonly locating = signal(false);
  readonly error = signal('');
  readonly placeAddress = signal('');
  private request = 0;
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['addressContext'] && !changes['addressContext'].firstChange) {
      this.request++;
      this.placeAddress.set('');
    }
  }
  point(): Coordinates | null {
    return LocationUtils.point(this.latitude, this.longitude);
  }
  pins(): MapPin[] {
    const point = this.point();
    return point ? [{ ...point, id: 'location', title: 'Vị trí cơ sở; kéo để điều chỉnh' }] : [];
  }
  select(point: Coordinates): void {
    if (this.disabled) return;
    this.request++;
    this.locationChange.emit(point);
    this.error.set('');
  }
  clear(): void {
    if (this.disabled) return;
    this.request++;
    this.placeAddress.set('');
    this.locationChange.emit(null);
  }
  selectPlace(place: MapPlace): void {
    if (this.disabled) return;
    this.placeAddress.set(place.address || place.name);
    // Let the form replace the address before applying its newly selected coordinate pair.
    this.placeSelected.emit(place);
    this.select(place);
  }
  async locate(): Promise<void> {
    if (this.locating() || this.disabled) return;
    const request = ++this.request;
    this.locating.set(true);
    this.error.set('');
    try {
      const point = await this.geolocation.locate();
      if (!this.destroy.destroyed && !this.disabled && request === this.request) this.select(point);
    } catch (error) {
      if (!this.destroy.destroyed && request === this.request)
        this.error.set((error as Error).message);
    } finally {
      if (!this.destroy.destroyed) this.locating.set(false);
    }
  }
}
