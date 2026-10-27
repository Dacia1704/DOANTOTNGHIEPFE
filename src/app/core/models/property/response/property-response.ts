import {
  RoomResponse,
  RoomAmenityResponse,
  RoomImageResponse,
} from '../../room/response/room-response';
import { PropertyRentalMode } from '../request/create-property-request';

export interface PropertyResponse {
  id: string;
  landlordId: string;
  name: string;
  propertyTypeId: string;
  propertyTypeName: string;
  rentalMode: PropertyRentalMode;
  totalFloors: number | null;
  provinceId: string;
  provinceName: string;
  wardId: string;
  wardName: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  amenities?: RoomAmenityResponse[];
  images?: RoomImageResponse[];
  rooms?: RoomResponse[];
  createdAt?: string;
  updatedAt?: string;
}
