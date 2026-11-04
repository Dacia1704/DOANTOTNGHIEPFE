export interface UpdatePropertyLocationRequest {
  provinceId: string;
  wardId: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
}
