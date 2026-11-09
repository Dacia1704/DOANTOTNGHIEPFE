export interface ReviewCreateRequest {
  rentalAgreementId: string;
  rating: number;
  comment: string;
}
export interface ReviewVisibilityRequest {
  hidden: boolean;
  reason: string;
}
