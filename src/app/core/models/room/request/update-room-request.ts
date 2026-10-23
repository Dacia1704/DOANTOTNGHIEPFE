import { RoomRentalStatus } from '../room.model';

export interface UpdateRoomRequest {
  roomTypeId: string;
  price: number;
  electricityPrice?: number;
  waterPrice?: number;
  serviceFee?: number;
  defaultDeposit?: number;
  areaM2: number;
  maxOccupants: number;
  provinceId: string;
  wardId: string;
  addressLine: string;
  latitude?: number;
  longitude?: number;
  rentalStatus?: RoomRentalStatus;
  amenityIds?: string[];
}
