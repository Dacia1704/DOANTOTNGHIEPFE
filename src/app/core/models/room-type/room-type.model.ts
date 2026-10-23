export interface RoomType {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  parentName: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface RoomTypeList {
  items: RoomType[];
  page: number;
  totalPages: number;
  total: number;
}

export interface RoomCategoryRoom {
  id: string;
  price: number;
  areaM2: number;
  maxOccupants: number;
  addressLine: string;
  provinceName: string;
  wardName: string;
  rentalStatus: string;
}

export interface RoomTypeCategory {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  rooms: RoomCategoryRoom[];
}
