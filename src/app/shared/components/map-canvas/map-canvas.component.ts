import { DOCUMENT } from '@angular/common';
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
import { GoogleMapsService } from '@services/maps/google-maps.service';
import {
  Coordinates,
  MapBounds,
  MapPin,
  MapsCircle,
  MapsInfoWindow,
  MapsLibrary,
  MapsListener,
  MapsMap,
  MapsMarker,
  MarkerLibrary,
} from '@model/maps/maps.model';
import { LocationUtils } from '@shared/utils/location-utils';

@Component({
  selector: 'app-map-canvas',
  template: `<div class="map-shell" [attr.aria-busy]="loading()">
    <div
      #host
      class="map-host"
      [hidden]="error() || maps.authError()"
      aria-label="Bản đồ vị trí"
    ></div>
    @if (loading()) {
      <p class="map-state" role="status">Đang tải bản đồ…</p>
    }
    @if (error() || maps.authError()) {
      <div class="map-state" role="status">
        <span class="material-symbols-outlined" aria-hidden="true">map</span>
        <p>{{ maps.authError() || error() }}</p>
        <button type="button" class="btn-secondary" (click)="initialize()">Thử tải lại</button>
      </div>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      .map-shell {
        position: relative;
        min-height: 340px;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }
      .map-host {
        height: 420px;
        max-height: 65dvh;
        min-height: 300px;
      }
      .map-host[hidden] {
        display: none;
      }
      .map-state {
        min-height: 260px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 24px;
        gap: 12px;
        color: var(--text-secondary);
        margin: 0;
      }
      .map-state > span {
        font-size: 36px;
      }
      .map-state p {
        max-width: 380px;
        line-height: 1.7;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapCanvasComponent implements AfterViewInit, OnChanges {
  readonly maps = inject(GoogleMapsService);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  @Input() pins: MapPin[] = [];
  @Input() center: Coordinates | null = null;
  @Input() editable = false;
  @Input() disabled = false;
  @Input() radiusKm = 0;
  @Output() readonly positionChange = new EventEmitter<Coordinates>();
  @Output() readonly boundsChange = new EventEmitter<MapBounds>();
  @Output() readonly pinSelected = new EventEmitter<string>();
  readonly loading = signal(false);
  readonly error = signal('');
  private map?: MapsMap;
  private library?: MapsLibrary & MarkerLibrary;
  private markers: MapsMarker[] = [];
  private listeners: MapsListener[] = [];
  private circle?: MapsCircle;
  private popup?: MapsInfoWindow;
  private lastCenter = '';
  private lastRadius = 0;

  constructor() {
    this.destroy.onDestroy(() => {
      this.clearMarkers();
      this.listeners.forEach((listener) => listener.remove());
      this.circle?.setMap(null);
    });
  }
  ngAfterViewInit(): void {
    void this.initialize();
  }
  ngOnChanges(): void {
    if (this.map) this.update();
  }

  async initialize(): Promise<void> {
    if (this.loading() || this.destroy.destroyed) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const library = await this.maps.libraries();
      if (this.destroy.destroyed) return;
      this.library = library;
      if (!this.map) {
        const first =
          (this.center && LocationUtils.point(this.center.latitude, this.center.longitude)) ??
          this.pins.find((pin) => LocationUtils.point(pin.latitude, pin.longitude));
        this.map = new library.Map(this.host.nativeElement, {
          center: first
            ? { lat: first.latitude, lng: first.longitude }
            : { lat: 16.047079, lng: 108.20623 },
          zoom: first ? (this.editable ? 16 : 13) : 6,
          mapId: this.maps.config.mapId,
          gestureHandling: 'cooperative',
          streetViewControl: false,
          mapTypeControl: false,
        });
        this.listeners.push(
          this.map.addListener('idle', () => {
            const bounds = this.map?.getBounds()?.toJSON();
            if (bounds) this.boundsChange.emit(bounds);
          }),
        );
        this.listeners.push(
          this.map.addListener('click', (event) => {
            if (!this.editable || this.disabled || !event?.latLng) return;
            this.positionChange.emit({
              latitude: event.latLng.lat(),
              longitude: event.latLng.lng(),
            });
          }),
        );
      }
      this.update();
    } catch (error) {
      if (!this.destroy.destroyed)
        this.error.set(error instanceof Error ? error.message : 'Không tải được bản đồ.');
    } finally {
      if (!this.destroy.destroyed) this.loading.set(false);
    }
  }
  private update(): void {
    if (!this.map || !this.library) return;
    const point = this.center && LocationUtils.point(this.center.latitude, this.center.longitude);
    const key = point ? `${point.latitude},${point.longitude}` : '';
    if (point && key !== this.lastCenter)
      this.map.setCenter({ lat: point.latitude, lng: point.longitude });
    if (
      point &&
      (key !== this.lastCenter || (this.radiusKm > 0 && this.radiusKm !== this.lastRadius))
    ) {
      this.map.setZoom(
        this.editable
          ? 16
          : this.radiusKm > 0
            ? Math.max(5, Math.min(17, Math.round(14 - Math.log2(this.radiusKm / 3))))
            : 14,
      );
    }
    this.lastCenter = key;
    this.lastRadius = this.radiusKm;
    this.clearMarkers();
    for (const pin of this.pins) {
      if (!LocationUtils.point(pin.latitude, pin.longitude)) continue;
      const marker = new this.library.AdvancedMarkerElement({
        map: this.map,
        position: { lat: pin.latitude, lng: pin.longitude },
        title: pin.title,
        gmpDraggable: this.editable && !this.disabled,
        gmpClickable: !this.editable,
      });
      if (pin.label) {
        const label = this.document.createElement('span');
        label.textContent = pin.label;
        label.style.cssText =
          'display:block;padding:7px 10px;background:#006b5e;color:white;border:2px solid white;border-radius:20px;box-shadow:0 2px 8px #0004;font:600 13px system-ui;white-space:nowrap';
        marker.append(label);
      }
      if (this.editable)
        marker.addEventListener('gmp-dragend', () => {
          if (this.disabled || !marker.position) return;
          const position = marker.position;
          const latitude = typeof position.lat === 'function' ? position.lat() : position.lat;
          const longitude = typeof position.lng === 'function' ? position.lng() : position.lng;
          const point = LocationUtils.point(latitude, longitude);
          if (point) this.positionChange.emit(point);
        });
      else marker.addEventListener('gmp-click', () => this.openPopup(pin, marker));
      this.markers.push(marker);
    }
    this.circle?.setMap(null);
    if (point && this.radiusKm > 0)
      this.circle = new this.library.Circle({
        map: this.map,
        center: { lat: point.latitude, lng: point.longitude },
        radius: this.radiusKm * 1000,
        strokeColor: '#00897b',
        strokeWeight: 2,
        fillColor: '#00897b',
        fillOpacity: 0.1,
        clickable: false,
      });
  }
  private clearMarkers(): void {
    this.popup?.close();
    for (const marker of this.markers) {
      marker.map = null;
      marker.remove();
    }
    this.markers = [];
  }
  private openPopup(pin: MapPin, marker: MapsMarker): void {
    if (!this.map || !this.library) return;
    this.popup ??= new this.library.InfoWindow();
    const content = this.document.createElement('div');
    content.style.cssText = 'max-width:240px;color:#182521;font:14px system-ui;line-height:1.5';
    if (pin.image && (/^https?:\/\//i.test(pin.image) || /^\/(?!\/)/.test(pin.image))) {
      const image = this.document.createElement('img');
      image.src = pin.image;
      image.alt = pin.title;
      image.style.cssText = 'width:100%;height:110px;object-fit:cover;border-radius:8px';
      content.append(image);
    }
    const title = this.document.createElement('strong');
    title.textContent = pin.title;
    content.append(title);
    for (const text of [pin.label, pin.address]) {
      if (!text) continue;
      const line = this.document.createElement('p');
      line.textContent = text;
      content.append(line);
    }
    if (pin.id !== 'location') {
      const link = this.document.createElement('a');
      link.href = `/tro/${encodeURIComponent(pin.id)}`;
      link.textContent = 'Xem chi tiết tin';
      link.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        this.pinSelected.emit(pin.id);
      });
      content.append(link);
    }
    this.popup.setContent(content);
    this.popup.open({ map: this.map, anchor: marker });
  }
}
