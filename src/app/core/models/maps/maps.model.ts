export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface MapBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}
export interface MapPlace extends Coordinates {
  address: string;
  name: string;
  addressLine?: string;
}
export interface MapPin extends Coordinates {
  id: string;
  title: string;
  label?: string;
  address?: string;
  image?: string;
}
export type LocationFilter =
  ({ kind: 'radius'; radiusKm: number } & Coordinates) | ({ kind: 'bounds' } & MapBounds);
