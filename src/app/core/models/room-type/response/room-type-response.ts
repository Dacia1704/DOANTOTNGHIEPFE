export interface RoomTypeResponse {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parentName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
