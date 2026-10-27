export interface PropertyType {
  id: string;
  name: string;
  description: string;
  createdAt: Date | null;
}
export interface PropertyTypeList {
  items: PropertyType[];
  page: number;
  total: number;
  totalPages: number;
}
