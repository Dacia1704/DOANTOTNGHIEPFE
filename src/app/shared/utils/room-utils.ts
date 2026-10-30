import {
  RoomRentalStatus,
  ROOM_STATUS_LABELS,
  ROOM_STATUS_BADGE_CLASSES,
} from '@model/room/room.model';

export class RoomUtils {
  /** Distinguish an unspecified fee from an explicitly free service. */
  static formatFee(value: number | null): string {
    return value === null
      ? 'Chưa khai báo'
      : value === 0
        ? 'Miễn phí'
        : `${value.toLocaleString('vi-VN')} đ`;
  }

  /**
   * Format price display theo chuẩn Việt Nam
   * @param price Giá tiền (VNĐ)
   * @returns VD: "3.800.000 đ / tháng"
   */
  static formatPrice(price: number): string {
    if (price == null || isNaN(price)) return '0 đ / tháng';
    const formatted = price.toLocaleString('vi-VN');
    return `${formatted} đ / tháng`;
  }

  /**
   * Format diện tích phòng
   * @param areaM2 Diện tích theo m2
   * @returns VD: "28.5 m²"
   */
  static formatArea(areaM2: number): string {
    if (areaM2 == null || isNaN(areaM2)) return '0 m²';
    return `${areaM2} m²`;
  }

  /**
   * Lấy text hiển thị trạng thái phòng
   */
  static getStatusLabel(status: RoomRentalStatus): string {
    return ROOM_STATUS_LABELS[status] || 'Không xác định';
  }

  /**
   * Lấy class CSS badge tương ứng trạng thái phòng
   */
  static getStatusBadgeClass(status: RoomRentalStatus): string {
    return ROOM_STATUS_BADGE_CLASSES[status] || 'badge-secondary';
  }
}
