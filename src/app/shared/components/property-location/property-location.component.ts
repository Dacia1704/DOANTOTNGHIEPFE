import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { Coordinates, MapPin } from '@model/maps/maps.model';
import { LocationUtils } from '@shared/utils/location-utils';
import { MapCanvasComponent } from '../map-canvas/map-canvas.component';

@Component({
  selector: 'app-property-location',
  imports: [MapCanvasComponent],
  template: `<section class="property-location" aria-label="Vị trí cơ sở">
    <div class="location-heading">
      <div>
        <h3>Vị trí</h3>
        <p>{{ address || 'Chưa có địa chỉ.' }}</p>
      </div>
      @if (address || point()) {
        <a class="btn-secondary" [href]="directions()" target="_blank" rel="noopener noreferrer">{{
          point() ? 'Chỉ đường' : 'Tìm địa chỉ trên OpenStreetMap'
        }}</a>
      }
    </div>
    @if (point()) {
      @if (collapsible) {
        <details (toggle)="opened.set($any($event.target).open)">
          <summary>Xem vị trí trên bản đồ</summary>
          @if (opened()) {
            <app-map-canvas [pins]="pins()" [center]="point()" />
          }
        </details>
      } @else {
        <app-map-canvas [pins]="pins()" [center]="point()" />
      }
    } @else {
      <p class="location-note">Cơ sở chưa bổ sung ghim vị trí. Bạn có thể tra cứu bằng địa chỉ.</p>
    }
  </section>`,
  styles: [
    `
      :host {
        display: block;
      }
      .property-location {
        display: grid;
        gap: 16px;
        margin: 20px 0;
      }
      .location-heading {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
      .location-heading h3 {
        margin: 0 0 8px;
      }
      .location-heading p,
      .location-note {
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 1.7;
        margin: 0;
      }
      .location-heading a {
        text-decoration: none;
        display: inline-flex;
        align-items: center;
      }
      summary {
        cursor: pointer;
        color: var(--primary);
        margin-bottom: 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyLocationComponent {
  @Input() latitude: number | null | undefined;
  @Input() longitude: number | null | undefined;
  @Input() address = '';
  @Input() collapsible = false;
  readonly opened = signal(false);
  point(): Coordinates | null {
    return LocationUtils.point(this.latitude, this.longitude);
  }
  pins(): MapPin[] {
    const point = this.point();
    return point ? [{ ...point, id: 'location', title: this.address || 'Vị trí cơ sở' }] : [];
  }
  directions(): string {
    return LocationUtils.directions(this.latitude, this.longitude, this.address);
  }
}
