import { Report, ReportDetail, ReportEvidence, ReportListing } from './report.model';
import {
  ReportResponse,
  ReportDetailResponse,
  ReportEvidenceResponse,
  ReportListingResponse,
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
      warningLevel: r.warningLevel ?? 0,
      sanctionAction: r.sanctionAction ?? 'NONE',
      sanctionedListingId: r.sanctionedListingId ?? null,
      originListingId: r.originListingId ?? null,
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
      originListing: r.originListing ? this.listing(r.originListing) : null,
      sanctionedListing: r.sanctionedListing ? this.listing(r.sanctionedListing) : null,
    };
  }
  static listing(r: ReportListingResponse): ReportListing {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
      expiresAt: r.expiresAt ? new Date(r.expiresAt) : null,
      propertyId: r.propertyId,
      propertyName: r.propertyName,
      fullAddress: [r.addressLine, r.wardName, r.provinceName].filter(Boolean).join(', '),
      landlordId: r.landlordId,
    };
  }
}
