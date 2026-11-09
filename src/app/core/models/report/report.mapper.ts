import { Report, ReportDetail, ReportEvidence } from './report.model';
import {
  ReportResponse,
  ReportDetailResponse,
  ReportEvidenceResponse,
} from './response/report-response';
export class ReportMapper {
  static fromResponse(r: ReportResponse): Report {
    return {
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      targetName: r.targetName,
      reasonCode: r.reasonCode,
      description: r.description,
      status: r.status,
      handledBy: r.handledBy,
      handledByName: r.handledByName,
      resolutionNote: r.resolutionNote,
      resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : null,
      createdAt: new Date(r.createdAt),
    };
  }
  static evidence(r: ReportEvidenceResponse): ReportEvidence {
    return { id: r.id, createdAt: new Date(r.createdAt) };
  }
  static detail(r: ReportDetailResponse): ReportDetail {
    return {
      report: this.fromResponse(r.report),
      evidences: r.evidences.map((e) => this.evidence(e)),
    };
  }
}
