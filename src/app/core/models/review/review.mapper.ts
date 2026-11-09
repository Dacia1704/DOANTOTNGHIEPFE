import { Review, ReviewEligibility } from './review.model';
import {
  ReviewDetailResponse,
  ReviewEligibilityResponse,
  ReviewResponse,
  ReceivedReviewResponse,
} from './response/review-response';
export class ReviewMapper {
  static fromResponse(r: ReviewResponse): Review {
    return {
      id: r.id,
      type: r.type,
      rating: r.rating,
      comment: r.comment,
      landlordReply: r.landlordReply,
      authorName: r.authorName,
      authorAvatarUrl: r.authorAvatarUrl,
      createdAt: new Date(r.createdAt),
      verifiedStay: r.verifiedStay,
      agreementId: null,
      agreementCode: null,
      targetId: null,
      targetName: null,
      propertyName: null,
      hidden: false,
      hiddenAt: null,
      hiddenBy: null,
      hiddenReason: null,
      canReply: false,
    };
  }
  static detail(r: ReviewDetailResponse): Review {
    return {
      ...this.fromResponse(r.review),
      agreementId: r.rentalAgreementId,
      targetId: r.targetId,
      targetName: r.targetName,
      hidden: r.hidden,
      hiddenAt: r.hiddenAt ? new Date(r.hiddenAt) : null,
      hiddenBy: r.hiddenBy,
      hiddenReason: r.hiddenReason,
    };
  }
  static received(r: ReceivedReviewResponse): Review {
    return {
      ...this.fromResponse(r.review),
      agreementId: r.rentalAgreementId,
      agreementCode: r.agreementCode,
      targetId: r.targetId,
      targetName: r.targetName,
      propertyName: r.propertyName,
      canReply: r.canReply,
    };
  }
  static eligibility(r: ReviewEligibilityResponse): ReviewEligibility {
    return { ROOM: { ...r.room }, LANDLORD: { ...r.landlord }, TENANT: { ...r.tenant } };
  }
}
