export interface RoomCategoryRoomResponse {
  id: string;
  price: number;
  areaM2: number;
  maxOccupants: number;
  addressLine: string;
  provinceName?: string;
  wardName?: string;
  rentalStatus: string;
}

export interface RoomTypeCategoryResponse {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  rooms?: RoomCategoryRoomResponse[];
}
