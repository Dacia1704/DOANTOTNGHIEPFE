import { PageResponse } from '../api-response';

export type ReviewTarget = 'ROOM' | 'LANDLORD';
export interface ReviewSummary {
  averageRating: number | null;
  totalReviews: number;
  replyRate: number | null;
  distribution: { stars: number; count: number }[];
}
export interface ListingReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  landlordReply: string | null;
  createdAt: string;
  roomNumber: string;
  verifiedStay: boolean;
}
export interface ListingReviews {
  summary: ReviewSummary;
  reviews: PageResponse<ListingReview>;
}
