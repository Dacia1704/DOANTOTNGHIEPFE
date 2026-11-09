export class ReportImageUtils {
  /** Validate evidence image format, size and decoded dimensions before uploading. */
  static async validate(file: File): Promise<void> {
    if (
      !['image/jpeg', 'image/png'].includes(file.type) ||
      file.size > 5 * 1024 * 1024 ||
      !file.size
    )
      throw new Error('Chọn ảnh JPEG/PNG, mỗi ảnh tối đa 5 MB.');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (
        image.naturalWidth > 4096 ||
        image.naturalHeight > 4096 ||
        !image.naturalWidth ||
        !image.naturalHeight
      )
        throw new Error('Kích thước ảnh không được vượt quá 4096 × 4096 px.');
    } catch (e) {
      if (e instanceof Error && e.message.includes('4096')) throw e;
      throw new Error('Không đọc được ảnh. Vui lòng chọn tệp JPEG/PNG hợp lệ.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
