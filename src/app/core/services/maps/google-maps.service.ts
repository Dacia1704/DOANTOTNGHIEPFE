import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import {
  MapsApi,
  MapsLibrary,
  MapsWindow,
  MarkerLibrary,
  PlacesLibrary,
} from '@model/maps/maps.model';
import { googleMapsConfig } from '../../../../environments/google-maps.config';

export const GOOGLE_MAPS_CONFIG = new InjectionToken('GOOGLE_MAPS_CONFIG', {
  factory: () => googleMapsConfig,
});

@Injectable({ providedIn: 'root' })
export class GoogleMapsService {
  readonly config = inject(GOOGLE_MAPS_CONFIG);
  readonly authError = signal('');
  private readonly document = inject(DOCUMENT);
  private pending?: Promise<MapsApi>;

  load(): Promise<MapsApi> {
    const target = this.document.defaultView as MapsWindow | null;
    if (!target || !this.config.apiKey.trim()) {
      return Promise.reject(
        new Error('Bản đồ chưa sẵn sàng. Vui lòng cấu hình Google Maps API key.'),
      );
    }
    if (this.pending) return this.pending;
    this.authError.set('');
    if (target.google?.maps?.importLibrary) return Promise.resolve(target.google.maps);
    this.pending = new Promise<MapsApi>((resolve, reject) => {
      const script = this.document.createElement('script');
      let settled = false;
      const previousAuthFailure = target.gm_authFailure;
      const failure = () => {
        if (settled) return;
        settled = true;
        target.clearTimeout(timeout);
        script.remove();
        delete target.__trototMapsReady;
        target.gm_authFailure = previousAuthFailure;
        reject(
          new Error(
            'Không tải được Google Maps. Kiểm tra kết nối và cấu hình API key rồi thử lại.',
          ),
        );
      };
      const timeout = target.setTimeout(failure, 20000);
      target.gm_authFailure = () => {
        this.authError.set(
          'Không tải được Google Maps. Kiểm tra API key, quyền truy cập và Billing.',
        );
        failure();
        previousAuthFailure?.();
      };
      target.__trototMapsReady = () => {
        if (settled) return;
        const api = target.google?.maps;
        if (!api?.importLibrary) {
          failure();
          return;
        }
        settled = true;
        target.clearTimeout(timeout);
        delete target.__trototMapsReady;
        script.onerror = null;
        resolve(api);
      };
      const url = new URL('https://maps.googleapis.com/maps/api/js');
      url.searchParams.set('key', this.config.apiKey);
      url.searchParams.set('v', 'weekly');
      url.searchParams.set('language', 'vi');
      url.searchParams.set('region', 'VN');
      url.searchParams.set('loading', 'async');
      url.searchParams.set('callback', '__trototMapsReady');
      script.src = url.toString();
      script.async = true;
      script.onerror = failure;
      this.document.head.append(script);
    }).catch((error: unknown) => {
      this.pending = undefined;
      throw error;
    });
    return this.pending;
  }
  async libraries(): Promise<MapsLibrary & MarkerLibrary> {
    const api = await this.load();
    const [maps, markers] = await Promise.all([
      api.importLibrary('maps'),
      api.importLibrary('marker'),
    ]);
    return { ...(maps as MapsLibrary), ...(markers as MarkerLibrary) };
  }
  async places(): Promise<PlacesLibrary> {
    const api = await this.load();
    return (await api.importLibrary('places')) as PlacesLibrary;
  }
}
