import {
  CurrentSubscription,
  Listing,
  OrderType,
  SubscriptionOrder,
} from '@model/billing/billing.model';

export class BillingUtils {
  static readonly labels: Record<string, string> = {
    FREE: 'Miễn phí',
    ACTIVE: 'Đang hoạt động',
    EXPIRED: 'Đã hết hạn',
    PENDING: 'Đang chờ',
    PENDING_PAYMENT: 'Chờ thanh toán',
    AWAITING_ADMIN_CONFIRMATION: 'Chờ xác nhận đổi gói',
    SCHEDULED: 'Đã xếp lịch',
    SUCCESS: 'Đã thanh toán',
    FAILED: 'Thất bại',
    REFUNDED: 'Đã hoàn tiền',
    REQUIRES_REVIEW: 'Cần đối soát',
    APPLIED: 'Đã áp dụng',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã kết thúc quyền gói cũ',
    PUBLISHED: 'Đang hiển thị',
    REJECTED: 'Bị từ chối',
    HIDDEN: 'Đã ẩn',
    PURCHASE: 'Mua gói',
    RENEW: 'Gia hạn',
    CHANGE: 'Đổi gói',
    SERVICE_PACKAGE: 'Gói dịch vụ',
    BOOST_PACKAGE: 'Boost tin đăng',
  };
  /** Keep unknown server states visible rather than assuming success. */
  static label(status: string): string {
    return this.labels[status] ?? status;
  }
  /** Never infer upgrade eligibility from catalogue price, name, or current rights alone. */
  static orderLabel(order: Pick<SubscriptionOrder, 'type' | 'immediateUpgrade'>): string {
    if (order.type !== 'CHANGE') return this.label(order.type);
    if (order.immediateUpgrade === true) return 'Nâng gói ngay';
    if (order.immediateUpgrade === false) return 'Đổi gói từ kỳ sau';
    return this.label(order.type);
  }
  /** Format all billing timestamps in Vietnam, including on devices in other zones. */
  static date(value: Date | null | undefined): string {
    return value
      ? new Intl.DateTimeFormat('vi-VN', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'Asia/Ho_Chi_Minh',
        }).format(value)
      : 'Chưa xác định';
  }
  /** Prefer the server error message, with actionable fallbacks for integration failures. */
  static error(error: unknown): string {
    const e = error as { status?: number; error?: { message?: string } };
    if (e.status === 0) return 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.';
    if (e.status === 503)
      return 'Cổng VNPay chưa sẵn sàng. Đơn của bạn được giữ lại để thử thanh toán sau.';
    if (e.status === 502)
      return 'Chưa kiểm tra được với VNPay. Kết quả đã ghi nhận được giữ nguyên; vui lòng thử lại sau.';
    return e.error?.message || 'Không thực hiện được thao tác. Vui lòng thử lại.';
  }
  /** The server remains authoritative when rights change between selection and checkout. */
  static orderType(
    current: CurrentSubscription,
    packageId: string,
    currentPackageId?: string,
  ): OrderType {
    if (current.free || !current.canSubmitListings) return 'PURCHASE';
    return packageId === currentPackageId ? 'RENEW' : 'CHANGE';
  }
  static openChange(orders: SubscriptionOrder[]): SubscriptionOrder | undefined {
    return orders.find(
      (order) =>
        order.type === 'CHANGE' &&
        (['AWAITING_ADMIN_CONFIRMATION', 'SCHEDULED'].includes(order.status) ||
          (order.status === 'PENDING_PAYMENT' && this.future(order.expiresAt))),
    );
  }
  static future(date: Date | null | undefined): boolean {
    return !!date && date.getTime() > Date.now();
  }
  static published(listing: Listing): boolean {
    return listing.status === 'PUBLISHED' && this.future(listing.expiresAt);
  }
}
