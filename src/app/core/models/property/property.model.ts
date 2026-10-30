import { Room, RoomAmenity, RoomImage } from '../room/room.model';
import { PropertyRentalMode } from './request/create-property-request';

export interface Property {
  id: string;
  name: string;
  propertyTypeId: string;
  propertyTypeName: string;
  rentalMode: PropertyRentalMode;
  rentalModeLabel: string;
  totalFloors: number | null;
  fullAddress: string;
  amenities: RoomAmenity[];
  images: RoomImage[];
  rooms: Room[];
  availableCount: number;
  rentedCount: number;
  maintenanceCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: Date | null;
}
export interface PropertyList {
  items: Property[];
  page: number;
  totalPages: number;
  total: number;
}
