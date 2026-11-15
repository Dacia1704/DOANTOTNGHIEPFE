export interface CommunityPostRequest {
  content: string;
  area: string;
  mediaIds: string[];
  listingIds: string[];
  expectedVersion?: number;
}
export interface CommunityCommentRequest {
  content: string;
  parentId?: string;
  expectedVersion?: number;
}
