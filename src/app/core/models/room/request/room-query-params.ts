import { RoomRentalStatus } from '../room.model';

export interface RoomQueryParams {
  keyword?: string;
  rentalMode?: 'WHOLE' | 'BY_ROOM';
  propertyTypeId?: string;
  minArea?: number;
  maxArea?: number;
  minOccupants?: number;
  minFloor?: number;
  maxFloor?: number;
  maxDeposit?: number;
  maxElectricityPrice?: number;
  maxWaterPrice?: number;
  maxServiceFee?: number;
  sort?: 'recommended' | 'newest' | 'price-asc' | 'price-desc';
  rankingSession?: string;
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
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  south?: number;
  north?: number;
  west?: number;
  east?: number;
}
