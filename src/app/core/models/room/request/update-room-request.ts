import { RoomRentalStatus } from '../room.model';

export interface UpdateRoomRequest {
  roomTypeId: string;
  price: number;
  electricityPrice?: number | null;
  waterPrice?: number | null;
  serviceFee?: number | null;
  defaultDeposit?: number | null;
  areaM2: number;
  maxOccupants: number;
  propertyId: string;
  roomNumber: string;
  floorNumber?: number | null;
  rentalStatus?: RoomRentalStatus;
  amenityIds?: string[];
}
