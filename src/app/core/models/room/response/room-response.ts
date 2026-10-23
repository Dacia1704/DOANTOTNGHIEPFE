import { RoomRentalStatus } from '../room.model';

export interface RoomAmenityResponse {
  id: string;
  name: string;
  icon: string | null;
}

export interface RoomImageResponse {
  id: string;
  url: string;
  sortOrder: number | null;
  createdAt?: string;
}

export interface RoomResponse {
  id: string;
  landlordId: string;
  roomTypeId: string;
  roomTypeName: string;
  price: number;
  electricityPrice: number | null;
  waterPrice: number | null;
  serviceFee: number | null;
  defaultDeposit: number | null;
  areaM2: number;
  maxOccupants: number;
  provinceId: string;
  provinceName: string;
  wardId: string;
  wardName: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  rentalStatus: RoomRentalStatus;
  amenities: RoomAmenityResponse[];
  images: RoomImageResponse[];
  createdAt?: string;
  updatedAt?: string;
}
