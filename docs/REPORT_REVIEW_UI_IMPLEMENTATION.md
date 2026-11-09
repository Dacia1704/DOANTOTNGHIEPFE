# Giao diện Review và Report

Triển khai theo source BE đối chiếu ngày 07/11/2026, `docs/RULE.md`, `docs/template/DESIGN.md` và design tokens trong `src/styles.scss`.

## Điểm truy cập

- Người thuê: menu tài khoản → **Đánh giá của tôi** (`/danh-gia-cua-toi`) hoặc **Báo cáo của tôi** (`/bao-cao-cua-toi`). Tab đánh giá gồm phòng, chủ trọ và đánh giá về chính người thuê.
- Hợp đồng: phần **Đánh giá từ hợp đồng** tại `/hop-dong/:id` và `/landlord/agreements/:id`. Điều kiện gửi từng loại được lấy từ BE. Người thuê có thể báo cáo chủ trọ đã có hợp đồng xác nhận; chủ trọ có thể xem nhận xét về người thuê.
- Chi tiết tin: **Báo cáo tin đăng**, **Báo cáo chủ trọ**; khách đăng nhập và giữ URL quay lại. Đánh giá công khai có lựa chọn phòng hiện tại hoặc toàn bộ cơ sở.
- Chủ trọ: sidebar → **Đánh giá & phản hồi** (`/landlord/reviews`), gồm đánh giá nhận được về phòng/chủ trọ và đánh giá đã viết về người thuê.
- Admin: sidebar → **Quản lý đánh giá** (`/admin/reviews`), **Quản lý báo cáo** (`/admin/reports`), chi tiết tại `/admin/reports/:id`.

## Hành vi chính

Review sử dụng điều kiện từ `review-eligibility`, gửi độc lập theo loại và không cho gửi lại đánh giá đã tồn tại. Người thuê xem được lý do đánh giá của mình bị ẩn. Chủ trọ phản hồi theo `canReply`; admin ẩn kèm lý do hoặc khôi phục. Nội dung người dùng được hiển thị dưới dạng văn bản.

Report gồm hai bước: lưu nội dung báo cáo, sau đó bổ sung ảnh. ID báo cáo được giữ sau khi tạo thành công. Từng ảnh có trạng thái riêng và nút gửi lại khi lỗi; gửi lại ảnh không tạo báo cáo mới. FE kiểm tra JPEG/PNG, tối đa 5 MiB/ảnh, 4096 × 4096 px và 5 ảnh/báo cáo. BE tiếp tục kiểm tra dữ liệu thực và quyền upload.

Ảnh minh chứng được tải bằng HttpClient dưới dạng Blob theo report/evidence ID. Không sử dụng `contentUrl` từ response để gửi request có token. Object URL được thu hồi khi thay dữ liệu hoặc đóng giao diện.

Admin chỉ kết thúc báo cáo đã nhận xử lý bởi chính tài khoản hiện tại; ghi chú bắt buộc. Xung đột nhận xử lý làm mới hồ sơ và hiển thị lỗi. Danh sách và các bộ đếm được tải lại khi quay về. Bộ lọc/tab/trang được giữ trong query params.

Các trang nhiều vai trò dùng chung đặt trong `shared/pages`; services và DTO/model/mapper tách theo domain trong `core`. Mỗi component có đủ TS/HTML/SCSS, dùng OnPush và signals, hủy subscription theo lifecycle. Giao diện tái sử dụng dashboard, management table và pager hiện có. Đã bổ sung tải font Be Vietnam Pro vốn được khai báo trong design system.

## Kiểm tra

- Production build hoàn tất; cảnh báo còn lại thuộc các trang/style hiện có.
- 21 bài kiểm tra thuộc 9 spec liên quan đã qua: API, eligibility, phân quyền, tạo báo cáo một lần, xử lý xung đột, hợp đồng và tin đăng.
- `scripts/review-report-ui.smoke.cjs` chạy trên Edge với API fixtures theo contract BE: guest redirect, đánh giá và bàn phím chọn sao, upload lỗi/thử lại, tải Blob có xác thực, phản hồi, kiểm duyệt, kết thúc báo cáo và nhận xử lý đồng thời. Kiểm tra bố cục 1440px/390px, không tràn ngang trang và không có lỗi runtime.
- Ảnh kiểm tra lưu trong `docs/screenshots/report-*.png` và `docs/screenshots/review-*.png`.

Smoke script nhận `FEEDBACK_PREVIEW_URL` (mặc định `http://127.0.0.1:4219`) và `PLAYWRIGHT_MODULE_PATH` để sử dụng bản Playwright/Playwright Core có sẵn. Có thể phục vụ production build bằng `scripts/rental-e2e-preview.cjs` với `RENTAL_PREVIEW_PORT=4219`; smoke script chặn request API trong trình duyệt để không ghi dữ liệu vào BE.

Chưa xác nhận tích hợp trên BE đang chạy với database và dịch vụ lưu ảnh thật. Không thay đổi source BE; không thêm dependency ứng dụng.
