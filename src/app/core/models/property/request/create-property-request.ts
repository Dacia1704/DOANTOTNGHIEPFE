export type PropertyRentalMode = 'WHOLE' | 'BY_ROOM';

export interface DefaultRoomRequest {
  roomTypeId?: string | null;
  price?: number | null;
  electricityPrice?: number | null;
  waterPrice?: number | null;
  serviceFee?: number | null;
  defaultDeposit?: number | null;
  areaM2?: number | null;
  maxOccupants?: number | null;
}
export interface CreateRoomItemRequest extends DefaultRoomRequest {
  roomNumber: string;
  amenityIds?: string[];
}
export interface CreateFloorRequest {
  floorNumber: number | null;
  rooms: CreateRoomItemRequest[];
}
export interface CreatePropertyRequest {
  name: string;
  propertyTypeId: string;
  rentalMode: PropertyRentalMode;
  totalFloors?: number | null;
  provinceId: string;
  wardId: string;
  addressLine: string;
  latitude?: number | null;
  longitude?: number | null;
  defaultRoom: DefaultRoomRequest;
  amenityIds: string[];
  floors: CreateFloorRequest[];
}
