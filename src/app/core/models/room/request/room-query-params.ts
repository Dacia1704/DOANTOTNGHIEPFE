import { RoomRentalStatus } from '../room.model';

export interface RoomQueryParams {
  page?: number;
  size?: number;
  roomTypeId?: string;
  roomTypeName?: string;
  provinceId?: string;
  wardId?: string;
  rentalStatus?: RoomRentalStatus | '';
  minPrice?: number;
  maxPrice?: number;
  amenityNames?: string[];
  amenityIds?: string[];
}
