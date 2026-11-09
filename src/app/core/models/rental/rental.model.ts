export type BookingAvailability = 'AVAILABLE' | 'HELD' | 'RENTED' | 'MAINTENANCE';
export const BOOKING_LABELS: Record<BookingAvailability, string> = {
  AVAILABLE: 'Còn phòng',
  HELD: 'Đang giữ chỗ — chờ khách xác nhận hợp đồng',
  RENTED: 'Đã cho thuê',
  MAINTENANCE: 'Bảo trì',
};
export interface RentalBooking {
  listingId: string;
  roomId: string;
  tenantFullName: string;
  tenantPhone: string;
  tenantEmail: string;
  tenantCitizenId: string;
  tenantPermanentAddress: string;
  proposedMoveInDate: string;
  durationMonths: number;
  occupantCount: number;
  message: string;
  acceptedPrivacyNotice: boolean;
}
export interface RentalRequest {
  id: string;
  listingId: string;
  roomId: string | null;
  roomNumber: string | null;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  maskedCitizenId?: string;
  permanentAddress?: string;
  proposedMoveInDate: string;
  endDate: string;
  durationMonths: number;
  occupantCount: number;
  message?: string;
  status: string;
  resolutionReason?: string;
  createdAt: string;
  expiresAt: string;
  agreementId?: string;
  pdfStatus?: string;
  thumbnailUrl?: string;
}
export interface RentalAgreement {
  id: string;
  requestId: string;
  agreementCode: string;
  roomId: string;
  roomNumber: string;
  propertyName: string;
  tenantName: string;
  landlordName: string;
  tenantId?: string;
  landlordId?: string;
  price: number;
  deposit: number | null;
  electricityPrice: number | null;
  waterPrice: number | null;
  serviceFee: number | null;
  startDate: string;
  endDate: string;
  status: string;
  pdfStatus: string;
  pdfSha256: string | null;
  confirmationExpiresAt: string;
  landlordConfirmedAt: string;
  tenantConfirmedAt: string | null;
  canConfirm: boolean;
  canDecline: boolean;
  canDownloadPdf: boolean;
  canCheckout: boolean;
  cancelReason?: string;
}
export const RENTAL_LABELS: Record<string, string> = {
  PENDING: 'Chờ chủ trọ xác nhận',
  ACCEPTED: 'Chủ trọ đã chấp nhận',
  REJECTED: 'Đã từ chối',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
  DRAFT: 'Bản nháp',
  PENDING_CONFIRMATION: 'Đang giữ phòng — chờ xác nhận',
  ACTIVE: 'Đã xác nhận thuê',
  TERMINATED: 'Đã trả phòng',
};
/** Mirrors LocalDate.plusMonths(months).minusDays(1), including month-end clamping. */
export function rentalEndDate(start: string, months: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isInteger(months) || months < 1 || months > 36)
    return '';
  const [y, m, d] = start.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  const result = new Date(Date.UTC(y, m - 1 + months, Math.min(d, last)));
  result.setUTCDate(result.getUTCDate() - 1);
  return result.toISOString().slice(0, 10);
}
