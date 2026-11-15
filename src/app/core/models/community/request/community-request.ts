export interface CommunityPostRequest {
  content: string;
  area: string;
  mediaIds: string[];
  listingIds: string[];
  expectedVersion?: number;
}
export interface CommunityCommentRequest {
  replyToId?: string;
  content: string;
  parentId?: string;
  expectedVersion?: number;
}
