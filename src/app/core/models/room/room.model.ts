export enum RoomRentalStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  MAINTENANCE = 'MAINTENANCE',
}

export const ROOM_STATUS_LABELS: Record<RoomRentalStatus, string> = {
  [RoomRentalStatus.AVAILABLE]: 'Còn phòng',
  [RoomRentalStatus.RENTED]: 'Đã thuê',
  [RoomRentalStatus.MAINTENANCE]: 'Đang bảo trì',
};

export const ROOM_STATUS_BADGE_CLASSES: Record<RoomRentalStatus, string> = {
  [RoomRentalStatus.AVAILABLE]: 'badge-success',
  [RoomRentalStatus.RENTED]: 'badge-secondary',
  [RoomRentalStatus.MAINTENANCE]: 'badge-warning',
};

export interface RoomAmenity {
  id: string;
  name: string;
  icon: string;
}

export interface RoomImage {
  id: string;
  url: string;
  sortOrder: number;
  createdAt: Date | null;
}

export interface Room {
  propertyId: string;
  roomNumber: string;
  displayName: string;
  floorNumber: number | null;
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
  fullAddress: string;
  latitude: number | null;
  longitude: number | null;
  rentalStatus: RoomRentalStatus;
  amenities: RoomAmenity[];
  images: RoomImage[];
  thumbnail: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface RoomListResult {
  items: Room[];
  page: number;
  totalPages: number;
  total: number;
}
