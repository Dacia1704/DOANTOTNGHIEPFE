import { Injectable, InjectionToken, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import type { Map as LibreMap } from 'maplibre-gl';
import { MapPlace } from '@model/maps/maps.model';
import { LocationUtils } from '@shared/utils/location-utils';
import { mapTilerConfig } from '@environments/maptiler.config';

export const MAPTILER_CONFIG = new InjectionToken('MAPTILER_CONFIG', {
  factory: () => mapTilerConfig,
});

interface GeocodingFeature {
  center?: [number, number];
  text?: string;
  place_name?: string;
  address?: string;
  place_type?: string[];
}

@Injectable({ providedIn: 'root' })
export class MapTilerService {
  readonly config = inject(MAPTILER_CONFIG);
  private readonly document = inject(DOCUMENT);
  private pending?: Promise<typeof import('maplibre-gl')>;

  private requireKey(): string {
    const key = this.config.apiKey.trim();
    if (!key) throw new Error('Bản đồ chưa sẵn sàng. Vui lòng cấu hình MapTiler API key.');
    return key;
  }

  load(): Promise<typeof import('maplibre-gl')> {
    try {
      this.requireKey();
      return (this.pending ??= import('maplibre-gl')
        .then((library) => {
          // v6 uses an external module worker, with a relative shared module.
          library.setWorkerUrl(
            new URL(
              `assets/maplibre/maplibre-gl-worker.mjs?v=${library.getVersion()}`,
              this.document.baseURI,
            ).href,
          );
          return library;
        })
        .catch((error: unknown) => {
          this.pending = undefined;
          throw error;
        }));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  styleUrl(): string {
    return `https://api.maptiler.com/maps/${encodeURIComponent(this.config.style)}/style.json?key=${encodeURIComponent(this.requireKey())}`;
  }

  /** MapTiler vector tiles expose translated names; retain local names when absent. */
  localize(map: LibreMap): void {
    if (!this.config.language) return;
    for (const layer of map.getStyle().layers) {
      if (layer.type !== 'symbol' || !layer.layout?.['text-field']) continue;
      const field = layer.layout['text-field'];
      if (!JSON.stringify(field).includes('name')) continue;
      map.setLayoutProperty(layer.id, 'text-field', [
        'coalesce',
        ['get', `name:${this.config.language}`],
        ['get', 'name'],
        '',
      ]);
    }
  }

  async search(query: string, signal?: AbortSignal): Promise<MapPlace[]> {
    const url = new URL(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(query.trim())}.json`,
    );
    url.searchParams.set('key', this.requireKey());
    url.searchParams.set('language', this.config.language);
    url.searchParams.set('country', 'vn');
    url.searchParams.set('limit', '5');
    url.searchParams.set('autocomplete', 'true');
    const response = await fetch(url, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Không tìm được địa điểm. Vui lòng thử lại sau.');
    const data = (await response.json()) as { features?: GeocodingFeature[] };
    return (data.features ?? []).flatMap((feature) => {
      const point = LocationUtils.point(feature.center?.[1], feature.center?.[0]);
      if (!point) return [];
      const result: MapPlace = {
        ...point,
        name: feature.text || '',
        address: feature.place_name || feature.text || '',
      };
      // Never fill a province/ward or POI name into the street-address field.
      if (feature.place_type?.some((type) => type === 'address' || type === 'road')) {
        result.addressLine = [feature.address, feature.text].filter(Boolean).join(' ');
      }
      return [result];
    });
  }
}
