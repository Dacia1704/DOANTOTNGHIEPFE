/**
 * DTO gửi lên `POST /api/auth/register`.
 * Khớp với `RegisterRequest.java` ở backend (validation rules):
 *  - email bắt buộc + đúng format
 *  - phone bắt buộc + đúng format VN (^(\+84|84|0)[0-9]{9}$)
 *  - password từ 8-100 ký tự
 *  - fullName bắt buộc
 *  - citizenId tuỳ chọn (≤ 20 ký tự)
 *  - roleCode bắt buộc (TENANT hoặc LANDLORD)
 */
export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  citizenId?: string;
  roleCode: 'TENANT' | 'LANDLORD';
}
