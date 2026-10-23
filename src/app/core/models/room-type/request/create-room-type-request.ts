export interface CreateRoomTypeRequest {
  name: string;
  description?: string;
  parentId?: string | null;
}
