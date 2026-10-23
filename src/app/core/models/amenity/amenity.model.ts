export interface Amenity {
  id: string;
  name: string;
  icon: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface AmenityList {
  items: Amenity[];
  page: number;
  totalPages: number;
  total: number;
}
