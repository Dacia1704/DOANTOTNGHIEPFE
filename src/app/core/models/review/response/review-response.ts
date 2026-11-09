export type ReviewType = 'ROOM' | 'LANDLORD' | 'TENANT';
export interface ReviewResponse {
  id: string;
  type: ReviewType;
  rating: number;
  comment: string | null;
  landlordReply: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  verifiedStay: boolean;
}
export interface ReviewDetailResponse {
  review: ReviewResponse;
  rentalAgreementId: string;
  hidden: boolean;
  hiddenBy: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  targetId: string | null;
  targetName: string | null;
}
export interface ReceivedReviewResponse {
  review: ReviewResponse;
  targetId: string;
  targetName: string;
  rentalAgreementId: string;
  agreementCode: string;
  roomId: string;
  roomNumber: string;
  propertyId: string;
  propertyName: string;
  canReply: boolean;
}
export interface ReviewEligibilityResponse {
  room: ReviewEligibilityOption;
  landlord: ReviewEligibilityOption;
  tenant: ReviewEligibilityOption;
}
export interface ReviewEligibilityOption {
  canCreate: boolean;
  reviewId: string | null;
  reason: string | null;
}
