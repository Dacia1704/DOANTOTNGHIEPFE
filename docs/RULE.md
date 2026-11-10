# Quy tắc phát triển frontend

## Component và cấu trúc

- Mỗi component có ba file riêng `.ts`, `.html`, `.scss`; không nhúng template/style vào TypeScript.
- Giữ bốn nhóm feature admin/auth/tenant/landlord; trang/component nhiều vai trò đặt trong shared. Mỗi component có một trách nhiệm, tách page điều phối khỏi component trình bày.
- Dùng tên `{name}.component.{ts|html|scss}`, Input cho dữ liệu và Output cho sự kiện. Theo cấu trúc hiện tại: standalone, OnPush, signals; hủy subscription theo lifecycle và cập nhật change detection khi dữ liệu async yêu cầu.

## Thiết kế

- Đọc `src/styles.scss` trước khi viết UI. Dùng CSS variables cho màu, spacing, radius và shadow; không tự hardcode lại design system.
- Màu chính teal (`--primary`, các biến hover/active/focus/subtle/container), màu phụ amber (`--secondary`), màu ngữ nghĩa success/warning/error/info và text-primary/secondary/placeholder.
- Spacing dùng `--space-*`, bo góc dùng `--radius-*`, đổ bóng dùng `--shadow-card`, `--shadow-hover`, `--shadow-floating`, `--shadow-modal` theo định nghĩa thực tế trong styles.scss.
- Font chung: Be Vietnam Pro. Tái sử dụng dialog, dashboard, management table, pager và trạng thái loading/error/empty hiện có. Nhãn trạng thái không chỉ dựa vào màu; hỗ trợ focus, keyboard và mobile.

## DTO, model và service

- DTO đặt trong `core/models/{entity}/request/` và `response/`; model và mapper đặt cùng domain (`{entity}.model.ts`, `{entity}.mapper.ts`).
- Service nhận DTO → mapper chuyển sang model → component dùng model. Chuyển ngày/enum và dữ liệu lồng tại mapper, không để component tự hiểu schema API.
- Tên service `{Entity}Service`; endpoint giữ trong biến private api, xây từ environment.apiUrl. Không nhân đôi `/api`.
- Kiểu trả Observable phải là model; tái sử dụng mapper và xử lý lỗi có ngữ cảnh bằng catchError khi cần. Không import fixture/mock vào ứng dụng.
- Không tự retry POST/mutation; khóa nút khi submit, giữ bản nháp khi lỗi. Đổi bộ lọc phải reset page và hủy request cũ khi đổi ngữ cảnh.

## Shared/utils

- Kiểm tra `src/app/shared/utils/` và `shared/components/` trước khi thêm hàm/component chung.
- Tái sử dụng TextUtils (VND, phần trăm, ngày) và ImageUtils (MIME base64, src ảnh). Kiểm tra chữ ký thực tế trong source trước khi gọi.
- Utils mới đặt `{feature}-utils.ts` hoặc `utils-{name}.ts`, export tên rõ theo feature, thêm JSDoc và cập nhật index.ts nếu domain đang dùng barrel export.
- Bảng dùng chung có hướng dẫn tại [management-table](../src/app/shared/components/management-table/README.md).

## Cách thực hiện thay đổi

- Nêu giả định và điểm chưa rõ; dùng giải pháp nhỏ nhất đáp ứng yêu cầu. Không thêm tính năng/abstraction ngoài phạm vi.
- Chỉ sửa phần liên quan, theo style hiện tại; dọn import/biến mà thay đổi của mình làm thừa. Không tự refactor code lân cận.
- Xác định tiêu chí kiểm chứng, chạy build/spec phù hợp và báo đúng kết quả/giới hạn. [Hướng dẫn UI và smoke](UI.md), [API nguồn duy nhất](../../RentalManagement/docs/api.md).
