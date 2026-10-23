export interface UpdateRoomTypeRequest {
  name: string;
  description?: string;
  parentId?: string | null;
}
