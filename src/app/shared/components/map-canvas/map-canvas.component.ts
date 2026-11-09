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
  SimpleChanges,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MapTilerService } from '@services/maps/maptiler.service';
import type { Map as LibreMap, Marker, Popup, GeoJSONSource } from 'maplibre-gl';
import { Coordinates, MapBounds, MapPin } from '@model/maps/maps.model';
import { LocationUtils } from '@shared/utils/location-utils';

@Component({
  selector: 'app-map-canvas',
  template: `<div class="map-shell" [attr.aria-busy]="loading()">
    <div #host class="map-host" [hidden]="error()" aria-label="Bản đồ vị trí"></div>
    @if (loading()) {
      <p class="map-state map-loading" role="status">Đang tải bản đồ…</p>
    }
    @if (error()) {
      <div class="map-state" role="status">
        <span class="material-symbols-outlined" aria-hidden="true">map</span>
        <p>{{ error() }}</p>
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
        height: var(--map-height, 420px);
        max-height: var(--map-max-height, 65dvh);
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
      .map-loading {
        position: absolute;
        inset: 0;
        background: var(--background);
        pointer-events: none;
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
  readonly maps = inject(MapTilerService);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  @Input() pins: MapPin[] = [];
  @Input() center: Coordinates | null = null;
  @Input() userPosition: Coordinates | null = null;
  @Input() recenterToken = 0;
  @Input() editable = false;
  @Input() disabled = false;
  @Input() radiusKm = 0;
  @Output() readonly positionChange = new EventEmitter<Coordinates>();
  @Output() readonly boundsChange = new EventEmitter<MapBounds>();
  @Output() readonly pinSelected = new EventEmitter<string>();
  readonly loading = signal(false);
  readonly error = signal('');
  private map?: LibreMap;
  private library?: typeof import('maplibre-gl');
  private markers: Marker[] = [];
  private popup?: Popup;
  private lastCenter = '';
  private lastRadius = 0;
  private resizeObserver?: ResizeObserver;
  private loadTimeout?: ReturnType<typeof setTimeout>;
  private styleReady = false;

  constructor() {
    this.destroy.onDestroy(() => this.dispose());
  }

  private dispose(): void {
    clearTimeout(this.loadTimeout);
    this.resizeObserver?.disconnect();
    this.clearMarkers();
    this.map?.remove();
    this.map = undefined;
    this.styleReady = false;
    this.lastCenter = '';
    this.lastRadius = 0;
  }
  ngAfterViewInit(): void {
    void this.initialize();
  }
  ngOnChanges(changes?: SimpleChanges): void {
    if (changes?.['recenterToken']) this.lastCenter = '';
    if (this.map) this.update();
  }

  async initialize(): Promise<void> {
    if (this.loading() || this.destroy.destroyed) return;
    this.dispose();
    this.loading.set(true);
    this.error.set('');
    try {
      const library = await this.maps.load();
      if (this.destroy.destroyed) return;
      this.library = library;
      const first =
        (this.center && LocationUtils.point(this.center.latitude, this.center.longitude)) ??
        this.pins.find((pin) => LocationUtils.point(pin.latitude, pin.longitude));
      const map = (this.map = new library.Map({
        container: this.host.nativeElement,
        style: this.maps.styleUrl(),
        center: first ? [first.longitude, first.latitude] : [108.20623, 16.047079],
        zoom: first ? (this.editable ? 16 : 14) : 6,
        pitch: 0,
        maxPitch: 0,
        dragRotate: false,
        touchPitch: false,
        cooperativeGestures: true,
        attributionControl: { compact: true },
        locale: {
          'NavigationControl.ZoomIn': 'Phóng to',
          'NavigationControl.ZoomOut': 'Thu nhỏ',
          'FullscreenControl.Enter': 'Toàn màn hình',
          'FullscreenControl.Exit': 'Thoát toàn màn hình',
          'AttributionControl.ToggleAttribution': 'Thông tin bản đồ',
          'CooperativeGesturesHandler.WindowsHelpText': 'Giữ Ctrl và cuộn để thu phóng bản đồ',
          'CooperativeGesturesHandler.MacHelpText': 'Giữ ⌘ và cuộn để thu phóng bản đồ',
          'CooperativeGesturesHandler.MobileHelpText': 'Dùng hai ngón tay để di chuyển bản đồ',
        },
      }));
      map.addControl(new library.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new library.FullscreenControl(), 'top-right');
      map.addControl(new library.ScaleControl({ unit: 'metric' }), 'bottom-left');
      map.on('moveend', () => this.emitBounds());
      map.on('style.load', () => {
        this.styleReady = true;
        this.maps.localize(map);
      });
      map.on('click', (event) => {
        if (!this.editable || this.disabled) return;
        const point = LocationUtils.point(event.lngLat.lat, event.lngLat.wrap().lng);
        if (point) this.positionChange.emit(point);
      });
      map.on('load', () => {
        clearTimeout(this.loadTimeout);
        this.loading.set(false);
        this.error.set('');
        this.update();
        this.emitBounds();
      });
      map.on('error', () => {
        // Tile failures after loading must not blank an otherwise usable map.
        if (!this.loading()) return;
        clearTimeout(this.loadTimeout);
        this.loading.set(false);
        this.error.set('Không tải được bản đồ. Vui lòng kiểm tra kết nối hoặc thử lại sau.');
      });
      this.loadTimeout = setTimeout(() => {
        this.loading.set(false);
        this.error.set('Tải bản đồ quá lâu. Vui lòng thử lại.');
      }, 20000);
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => map.resize());
        this.resizeObserver.observe(this.host.nativeElement);
      }
    } catch (error) {
      this.dispose();
      if (!this.destroy.destroyed) {
        this.loading.set(false);
        this.error.set(error instanceof Error ? error.message : 'Không tải được bản đồ.');
      }
    }
  }

  private emitBounds(): void {
    const bounds = this.map?.getBounds();
    if (!bounds) return;
    const west = bounds.getWest();
    const east = bounds.getEast();
    const wrap = (value: number) => ((((value + 180) % 360) + 360) % 360) - 180;
    this.boundsChange.emit({
      south: Math.max(-90, bounds.getSouth()),
      north: Math.min(90, bounds.getNorth()),
      west: east - west >= 360 ? -180 : wrap(west),
      east: east - west >= 360 ? 180 : wrap(east),
    });
  }

  private update(): void {
    if (!this.map || !this.library || !this.styleReady) return;
    const point = this.center && LocationUtils.point(this.center.latitude, this.center.longitude);
    const key = point ? `${point.latitude},${point.longitude}` : '';
    if (point && key !== this.lastCenter) this.map.setCenter([point.longitude, point.latitude]);
    if (point && (key !== this.lastCenter || this.radiusKm !== this.lastRadius)) {
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
      const element = this.document.createElement('button');
      element.type = 'button';
      element.className = `rental-map-marker${pin.label ? ' rental-map-marker--price' : ''}`;
      element.style.setProperty('--map-marker-color', this.maps.config.markerColor);
      element.setAttribute('aria-label', `${pin.title}${pin.label ? `, ${pin.label}` : ''}`);
      element.title = pin.title;
      if (pin.label) element.textContent = pin.label;
      else {
        const icon = this.document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = 'home';
        element.append(icon);
      }
      const marker = new this.library.Marker({
        element,
        anchor: 'bottom',
        draggable: this.editable && !this.disabled,
      })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(this.map);
      marker.on('dragend', () => {
        if (!this.editable || this.disabled) return;
        const position = marker.getLngLat().wrap();
        const point = LocationUtils.point(position.lat, position.lng);
        if (point) this.positionChange.emit(point);
      });
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!this.editable) this.openPopup(pin, marker);
      });
      this.markers.push(marker);
    }
    const userPoint =
      this.userPosition &&
      LocationUtils.point(this.userPosition.latitude, this.userPosition.longitude);
    if (userPoint) {
      const element = this.document.createElement('div');
      element.className = 'rental-map-user-position';
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', 'Vị trí của bạn');
      element.title = 'Vị trí của bạn';
      const marker = new this.library.Marker({ element, anchor: 'center', draggable: false })
        .setLngLat([userPoint.longitude, userPoint.latitude])
        .addTo(this.map);
      this.markers.push(marker);
    }
    this.updateRadius(point);
  }

  private updateRadius(point: Coordinates | null): void {
    if (!this.map) return;
    // Geodesic polygon: radiusKm is a real ground distance, independent of zoom/latitude.
    const ring: [number, number][] = [];
    if (point && this.radiusKm > 0 && Number.isFinite(this.radiusKm)) {
      const lat = (point.latitude * Math.PI) / 180;
      const lng = (point.longitude * Math.PI) / 180;
      const distance = this.radiusKm / 6371.0088;
      for (let step = 0; step < 96; step++) {
        const bearing = (step * 2 * Math.PI) / 96;
        const y = Math.asin(
          Math.sin(lat) * Math.cos(distance) +
            Math.cos(lat) * Math.sin(distance) * Math.cos(bearing),
        );
        const x =
          lng +
          Math.atan2(
            Math.sin(bearing) * Math.sin(distance) * Math.cos(lat),
            Math.cos(distance) - Math.sin(lat) * Math.sin(y),
          );
        ring.push([(x * 180) / Math.PI, (y * 180) / Math.PI]);
      }
      ring.push([...ring[0]]);
    }
    const data = {
      type: 'FeatureCollection' as const,
      features: ring.length
        ? [
            {
              type: 'Feature' as const,
              properties: {},
              geometry: { type: 'Polygon' as const, coordinates: [ring] },
            },
          ]
        : [],
    };
    const source = this.map.getSource('search-radius') as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      this.map.addSource('search-radius', { type: 'geojson', data });
      this.map.addLayer({
        id: 'search-radius-fill',
        type: 'fill',
        source: 'search-radius',
        paint: { 'fill-color': this.maps.config.radiusColor, 'fill-opacity': 0.1 },
      });
      this.map.addLayer({
        id: 'search-radius-line',
        type: 'line',
        source: 'search-radius',
        paint: { 'line-color': this.maps.config.radiusColor, 'line-width': 2 },
      });
    }
  }

  private clearMarkers(): void {
    this.popup?.remove();
    this.popup = undefined;
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];
  }
  private openPopup(pin: MapPin, marker: Marker): void {
    if (!this.map || !this.library) return;
    this.popup?.remove();
    this.popup = new this.library.Popup({
      offset: 32,
      maxWidth: '280px',
      className: 'rental-map-popup',
    });
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
    this.popup.setDOMContent(content).setLngLat(marker.getLngLat()).addTo(this.map);
  }
}
