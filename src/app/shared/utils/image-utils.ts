/**
 * Tiện ích xử lý ảnh dạng base64 / data URI / URL cho thẻ <img>.
 *
 * Backend có thể trả ảnh theo 3 dạng:
 *  - URL tuyệt đối (http/https)
 *  - Data URI đầy đủ (data:image/png;base64,...)
 *  - Base64 thuần không kèm prefix
 *
 * Class này cung cấp helper để chuẩn hoá về một src hợp lệ cho <img>.
 */
export class ImageUtils {

  /**
   * Nhận diện MIME của ảnh từ chuỗi base64 thông qua magic number.
   * Mặc định trả về 'image/jpeg' nếu không nhận diện được.
   */
  static detectImageMime(base64: string): string {
    if (!base64) {
      return 'image/jpeg';
    }

    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
    if (base64.startsWith('R0lGOD')) return 'image/gif';
    if (base64.startsWith('UklGR')) return 'image/webp';
    if (base64.startsWith('PD94bWwg')) return 'image/svg+xml';
    return 'image/jpeg';
  }

  /**
   * Chuẩn hoá src cho thẻ <img>.
   * - Nếu rỗng → trả về fallback (mặc định chuỗi rỗng).
   * - Nếu đã là URL (http/https) hoặc data URI đầy đủ → dùng luôn.
   * - Nếu là base64 thuần → tự động ghép `data:<mime>;base64,<...>`.
   */
  static toImageSrc(value: string | null | undefined, fallback = ''): string {
    if (!value) {
      return fallback;
    }

    if (value.startsWith('data:') || /^https?:\/\//i.test(value)) {
      return value;
    }

    return `data:${ImageUtils.detectImageMime(value)};base64,${value}`;
  }
}