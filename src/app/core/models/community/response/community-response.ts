import { CommunityPost, CommunityComment, ModerationCase } from '../community.model';
export type CommunityPostResponse = Omit<CommunityPost, 'createdAt'> & { createdAt: string };
export type CommunityCommentResponse = Omit<CommunityComment, 'createdAt'> & { createdAt: string };
export type ModerationCaseResponse = Omit<ModerationCase, 'createdAt'> & { createdAt: string };
