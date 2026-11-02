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

/** The small SDK surface used here, without shipping an SDK or legacy Places dependency. */
export interface MapsLatLng {
  lat(): number;
  lng(): number;
}
export interface MapsListener {
  remove(): void;
}
export interface MapsMap {
  addListener(
    event: string,
    callback: (event?: { latLng?: MapsLatLng | null }) => void,
  ): MapsListener;
  getBounds(): { toJSON(): MapBounds } | undefined;
  setCenter(point: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
}
export interface MapsMarker extends HTMLElement {
  position: { lat: number; lng: number } | MapsLatLng | null;
  map: MapsMap | null;
}
export interface MapsCircle {
  setMap(map: MapsMap | null): void;
}
export interface MapsInfoWindow {
  setContent(content: HTMLElement): void;
  open(options: { map: MapsMap; anchor: MapsMarker }): void;
  close(): void;
}
export interface MapsLibrary {
  Map: new (host: HTMLElement, options: Record<string, unknown>) => MapsMap;
  Circle: new (options: Record<string, unknown>) => MapsCircle;
  InfoWindow: new () => MapsInfoWindow;
}
export interface MarkerLibrary {
  AdvancedMarkerElement: new (options: Record<string, unknown>) => MapsMarker;
}
export interface MapsPlaceResult {
  location?: MapsLatLng;
  formattedAddress?: string;
  displayName?: string;
  addressComponents?: { longText: string; types: string[] }[];
  fetchFields(options: { fields: string[] }): Promise<unknown>;
}
export interface PlaceSelectEvent extends Event {
  placePrediction: { toPlace(): MapsPlaceResult };
}
export interface MapsAutocomplete extends HTMLElement {
  disabled: boolean;
}
export interface PlacesLibrary {
  PlaceAutocompleteElement: new (options: Record<string, unknown>) => MapsAutocomplete;
}
export interface MapsApi {
  importLibrary(name: string): Promise<unknown>;
}
export interface MapsWindow extends Window {
  google?: { maps?: MapsApi };
  __trototMapsReady?: () => void;
  gm_authFailure?: () => void;
}
