import {
  CommunityPostResponse,
  CommunityCommentResponse,
  ModerationCaseResponse,
} from './response/community-response';
import { CommunityPost, CommunityComment, ModerationCase } from './community.model';
export const CommunityMapper = {
  post: (dto: CommunityPostResponse): CommunityPost => ({
    ...dto,
    createdAt: new Date(dto.createdAt),
  }),
  comment: (dto: CommunityCommentResponse): CommunityComment => ({
    ...dto,
    createdAt: new Date(dto.createdAt),
  }),
  moderationCase: (dto: ModerationCaseResponse): ModerationCase => ({
    ...dto,
    createdAt: new Date(dto.createdAt),
  }),
};
