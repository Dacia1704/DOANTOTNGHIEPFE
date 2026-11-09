import { ReviewType } from './response/review-response';
export type { ReviewType } from './response/review-response';
export interface Review {
  id: string;
  type: ReviewType;
  rating: number;
  comment: string | null;
  landlordReply: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: Date;
  verifiedStay: boolean;
  agreementId: string | null;
  agreementCode: string | null;
  targetId: string | null;
  targetName: string | null;
  propertyName: string | null;
  hidden: boolean;
  hiddenAt: Date | null;
  hiddenBy: string | null;
  hiddenReason: string | null;
  canReply: boolean;
}
export interface ReviewPermission {
  canCreate: boolean;
  reviewId: string | null;
  reason: string | null;
}
export type ReviewEligibility = Record<ReviewType, ReviewPermission>;
export const REVIEW_LABELS: Record<ReviewType, string> = {
  ROOM: 'Phòng / cơ sở',
  LANDLORD: 'Chủ trọ',
  TENANT: 'Người thuê',
};
