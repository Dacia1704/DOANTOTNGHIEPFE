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
}
