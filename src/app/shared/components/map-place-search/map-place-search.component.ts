import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
  signal,
} from '@angular/core';
import { MapTilerService } from '@services/maps/maptiler.service';
import { MapPlace } from '@model/maps/maps.model';

@Component({
  selector: 'app-map-place-search',
  template: `<div class="place-search" [attr.aria-busy]="loading()">
    <div class="search-field">
      <span class="material-symbols-outlined" aria-hidden="true">search</span>
      <input
        type="search"
        aria-label="Tìm địa điểm"
        autocomplete="off"
        placeholder="Tìm đường, địa chỉ hoặc địa điểm…"
        [disabled]="disabled"
        [value]="query()"
        (input)="search($any($event.target).value)"
        (keydown.escape)="cancel()"
      />
    </div>
    @if (loading()) {
      <p role="status">Đang tìm địa điểm…</p>
    }
    @if (results().length) {
      <ul aria-label="Địa điểm gợi ý">
        @for (place of results(); track $index) {
          <li>
            <button type="button" [disabled]="disabled" (click)="select(place)">
              <strong>{{ place.name }}</strong
              ><span>{{ place.address }}</span>
            </button>
          </li>
        }
      </ul>
    }
    @if (searched() && !loading() && !error() && !results().length) {
      <p role="status">
        Không tìm thấy địa điểm. Thử địa chỉ cụ thể hơn hoặc chọn ghim trên bản đồ.
      </p>
    }
    @if (error()) {
      <p role="status">{{ error() }}</p>
      <button
        type="button"
        class="btn-secondary"
        [disabled]="disabled"
        (click)="search(query(), true)"
      >
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
      .search-field {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 14px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--surface, #fff);
      }
      .search-field:focus-within {
        outline: 2px solid var(--primary, #006b5e);
        outline-offset: 2px;
      }
      .search-field > span {
        color: var(--text-secondary);
      }
      input {
        width: 100%;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--text-primary);
        font: inherit;
        padding: 14px 0;
      }
      p {
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 1.7;
        margin: 8px 0;
      }
      ul {
        list-style: none;
        padding: 4px;
        margin: 6px 0;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: var(--surface, #fff);
      }
      li button {
        width: 100%;
        display: grid;
        gap: 4px;
        padding: 12px;
        text-align: left;
        border: 0;
        border-radius: 8px;
        color: var(--text-primary);
        background: transparent;
        cursor: pointer;
        font: inherit;
      }
      li button:hover,
      li button:focus-visible {
        background: var(--background, #f0f7f5);
      }
      li span {
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.5;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPlaceSearchComponent implements OnChanges {
  private readonly maps = inject(MapTilerService);
  private readonly destroy = inject(DestroyRef);
  @Input() disabled = false;
  @Input() context = '';
  @Input() includeStreetAddress = false;
  @Output() readonly placeSelected = new EventEmitter<MapPlace>();
  readonly query = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly results = signal<MapPlace[]>([]);
  readonly searched = signal(false);
  private timer?: ReturnType<typeof setTimeout>;
  private controller?: AbortController;
  private request = 0;

  constructor() {
    this.destroy.onDestroy(() => this.cancel());
  }

  ngOnChanges(): void {
    this.cancel();
  }

  cancel(): void {
    clearTimeout(this.timer);
    this.controller?.abort();
    this.request++;
    this.loading.set(false);
    this.results.set([]);
    this.searched.set(false);
    this.error.set('');
  }

  search(value: string, immediate = false): void {
    this.cancel();
    this.query.set(value);
    if (this.disabled || value.trim().length < 3) return;
    const request = this.request;
    this.timer = setTimeout(() => void this.lookup(value, request), immediate ? 0 : 350);
  }

  private async lookup(value: string, request: number): Promise<void> {
    this.controller = new AbortController();
    this.loading.set(true);
    try {
      const places = await this.maps.search(value, this.controller.signal);
      if (this.destroy.destroyed || this.disabled || request !== this.request) return;
      this.results.set(places);
      this.searched.set(true);
    } catch (error) {
      if (this.destroy.destroyed || request !== this.request) return;
      this.error.set(
        error instanceof Error ? error.message : 'Không tìm được địa điểm. Vui lòng thử lại.',
      );
    } finally {
      if (!this.destroy.destroyed && request === this.request) this.loading.set(false);
    }
  }

  select(place: MapPlace): void {
    if (this.disabled) return;
    this.cancel();
    this.query.set(place.address || place.name);
    const result = { ...place };
    if (!this.includeStreetAddress) delete result.addressLine;
    this.placeSelected.emit(result);
  }
}
