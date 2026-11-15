import { ReportReason, ReportTargetType } from '../response/report-response';
export interface ReportCreateRequest {
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: ReportReason;
  description: string;
  originListingId?: string;
  rentalAgreementId?: string;
}
