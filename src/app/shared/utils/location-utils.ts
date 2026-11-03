import { AbstractControl, ValidatorFn } from '@angular/forms';
import { Coordinates } from '@model/maps/maps.model';

export class LocationUtils {
  static point(
    latitude: number | null | undefined,
    longitude: number | null | undefined,
  ): Coordinates | null {
    return typeof latitude === 'number' &&
      Number.isFinite(latitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      typeof longitude === 'number' &&
      Number.isFinite(longitude) &&
      longitude >= -180 &&
      longitude <= 180
      ? { latitude, longitude }
      : null;
  }
  static directions(
    latitude: number | null | undefined,
    longitude: number | null | undefined,
    address: string,
  ): string {
    const point = this.point(latitude, longitude);
    const url = new URL(
      point ? 'https://www.openstreetmap.org/directions' : 'https://www.openstreetmap.org/search',
    );
    if (point) {
      url.searchParams.set('engine', 'fossgis_osrm_car');
      url.searchParams.set('route', `;${point.latitude},${point.longitude}`);
      url.hash = `map=16/${point.latitude}/${point.longitude}`;
    } else {
      url.searchParams.set('query', address);
    }
    return url.toString();
  }
  static readonly coordinatePair: ValidatorFn = (control: AbstractControl) => {
    const latitude = control.get('latitude')?.value;
    const longitude = control.get('longitude')?.value;
    if (latitude == null && longitude == null) return null;
    return LocationUtils.point(latitude, longitude) ? null : { coordinatePair: true };
  };
}
