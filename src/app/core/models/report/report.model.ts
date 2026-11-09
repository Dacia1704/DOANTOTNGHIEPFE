import { ReportReason, ReportStatus, ReportTargetType } from './response/report-response';
export type { ReportReason, ReportStatus, ReportTargetType } from './response/report-response';
export interface Report {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetName: string | null;
  reasonCode: ReportReason;
  description: string | null;
  status: ReportStatus;
  handledBy: string | null;
  handledByName: string | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}
export interface ReportEvidence {
  id: string;
  createdAt: Date;
}
export interface ReportDetail {
  report: Report;
  evidences: ReportEvidence[];
}
export const REPORT_STATUSES: Record<ReportStatus, string> = {
  PENDING: 'Chờ tiếp nhận',
  PROCESSING: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Đã từ chối',
};
export const REPORT_REASONS: Record<ReportReason, string> = {
  SCAM: 'Dấu hiệu lừa đảo',
  MISLEADING_INFORMATION: 'Thông tin sai lệch',
  INVALID_PRICE: 'Giá không chính xác',
  UNSAFE_CONDITION: 'Điều kiện không an toàn',
  INAPPROPRIATE_CONTENT: 'Nội dung không phù hợp',
  OTHER: 'Lý do khác',
};
export const REPORT_TARGETS: Record<ReportTargetType, string> = {
  LISTING: 'Tin đăng',
  LANDLORD: 'Chủ trọ',
};
