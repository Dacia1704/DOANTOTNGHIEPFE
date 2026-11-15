export type ModerationStatus = 'VISIBLE' | 'RESTRICTED' | 'PENDING' | 'HIDDEN' | 'REMOVED';
export type Reaction = 'LIKE' | 'LOVE' | 'WOW';
export interface CommunityMedia {
  id: string;
  url: string;
}
export interface CommunityListing {
  id: string;
  title: string;
  available: boolean;
}
export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  avatarUrl: string | null;
  role: string;
  content: string | null;
  area: string;
  status: ModerationStatus;
  version: number;
  pinned: boolean;
  edited: boolean;
  createdAt: Date;
  media: CommunityMedia[];
  listings: CommunityListing[];
  reactionCount: number;
  commentCount: number;
  myReaction: Reaction | null;
  saved: boolean;
  following: boolean;
}
export interface CommunityComment {
  id: string;
  postId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  avatarUrl: string | null;
  content: string | null;
  status: ModerationStatus;
  version: number;
  createdAt: Date;
  reactionCount: number;
  myReaction: Reaction | null;
  deleted: boolean;
}
export interface CommunitySlice<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
export interface ModerationRule {
  id: string;
  pattern: string;
  matchType: 'TOKEN' | 'PHRASE' | 'DOMAIN';
  action: 'RESTRICT' | 'REQUIRE_REVIEW' | 'HIDE';
  accentInsensitive: boolean;
  applyPosts: boolean;
  applyComments: boolean;
  applyReviews: boolean;
  applyReplies: boolean;
  enabled: boolean;
  reason: string;
  version: number;
}
export interface ModerationCase {
  id: string;
  targetType: string;
  targetId: string;
  authorName: string;
  snapshot: string;
  reason: string;
  status: ModerationStatus;
  source: string;
  resolved: boolean;
  contentVersion: number;
  createdAt: Date;
}
export const moderationLabels: Record<ModerationStatus, string> = {
  VISIBLE: 'Đang hiển thị',
  RESTRICTED: 'Bị hạn chế',
  PENDING: 'Chờ duyệt',
  HIDDEN: 'Đã ẩn',
  REMOVED: 'Đã gỡ',
};
