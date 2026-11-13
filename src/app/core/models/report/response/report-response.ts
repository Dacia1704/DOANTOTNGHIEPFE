export type ReportStatus = 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';
export type ReportTargetType = 'LISTING' | 'LANDLORD';
export type ReportReason =
  | 'SCAM'
  | 'MISLEADING_INFORMATION'
  | 'INVALID_PRICE'
  | 'UNSAFE_CONDITION'
  | 'INAPPROPRIATE_CONTENT'
  | 'OTHER';
export interface ReportResponse {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  landlordId: string;
  reasonCode: ReportReason;
  description: string | null;
  status: ReportStatus;
  handledBy: string | null;
  handledByName: string | null;
  targetName: string | null;
  warningLevel?: number;
  sanctionAction?: string;
  sanctionedListingId?: string | null;
  originListingId?: string | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ReportEvidenceResponse {
  id: string;
  contentUrl: string;
  createdAt: string;
}
export interface ReportDetailResponse {
  report: ReportResponse;
  evidences: ReportEvidenceResponse[];
  originListing?: ReportListingResponse | null;
  sanctionedListing?: ReportListingResponse | null;
}

export interface ReportListingResponse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  publishedAt: string | null;
  expiresAt: string | null;
  propertyId: string;
  propertyName: string;
  addressLine: string | null;
  wardName: string | null;
  provinceName: string | null;
  landlordId: string;
}

export interface ReportSanctionOptionsResponse {
  nextWarningLevel: number;
  listings: { id: string; title: string; status: string }[];
}
