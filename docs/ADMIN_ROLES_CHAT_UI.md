# Phân quyền admin và thứ tự hội thoại

Ngày triển khai: 09/11/2026. Giao diện theo bố cục mẫu được cung cấp, dùng design tokens và font của Trọ Tốt trong `docs/RULE.md`, `docs/template/DESIGN.md`, `src/styles.scss`.

## Phân quyền

Mở **Phân quyền & vai trò** trong sidebar admin hoặc `/admin/roles`.

- Ma trận lấy vai trò, danh sách quyền, trạng thái được cấp và các ô khóa từ `GET /api/admin/role-permissions`. Không sử dụng số lượng hoặc dữ liệu vai trò giả từ ảnh mẫu.
- Tìm theo mã/tên quyền hoặc tên vai trò; số quyền từng vai trò được tính từ dữ liệu BE. Tiêu đề và cột quyền được giữ khi cuộn bảng.
- Checkbox gửi `PATCH /api/admin/roles/{roleId}/permissions/{permissionId}` với `enabled`, `expectedVersion`. Chỉ cập nhật trạng thái và phiên bản sau phản hồi thành công. Khóa thao tác khi đang lưu; ô thuộc `lockedPermissionIds` luôn bị vô hiệu hóa.
- Khi gặp 409/403, tải lại ma trận và thông báo để người dùng kiểm tra. Không tự gửi lại thay đổi.
- Người không có `ROLE_PERMISSION_MANAGE` chỉ được xem. Quyền hiện tại được đồng bộ qua `/api/users/me/authorities` khi mở trang, chuyển trang admin, quay lại cửa sổ và sau cập nhật.
- Nhật ký dùng `/api/admin/role-permissions/audit`, phân trang theo khả năng API; không giả định có tổng số bản ghi.
- Các menu quản trị người dùng, review, report và phân quyền theo quyền đọc hiện tại. BE tiếp tục là nơi kiểm tra quyền thực tế.

## Chat

`ChatPageComponent` dùng chung cho trang tin nhắn và chat thu nhỏ. Chọn hội thoại đã có sẽ giữ vị trí trong danh sách; không đưa hội thoại đó lên đầu. Chuyển giữa các hội thoại đã tải không gọi lại danh sách, nên không chèn trạng thái loading làm xê dịch vị trí cuộn.

Vẫn tải lại khi người dùng yêu cầu hoặc mở đường dẫn tới hội thoại chưa có trong danh sách. Tin nhắn thực sự mới tiếp tục cập nhật nội dung xem trước và thứ tự theo thời gian.

## Kiểm tra

- Production build thành công; cảnh báo còn lại ở các trang/style có sẵn.
- 27 tests liên quan đã qua: API phân quyền, đồng bộ authority, khóa quyền, version, xung đột, tìm kiếm, thứ tự/vị trí cuộn chat, deep link và các kiểm tra admin/chat sẵn có.
- Browser smoke script: `scripts/roles-chat-ui.smoke.cjs`, sử dụng API fixtures theo contract BE và không ghi dữ liệu vào server. Kiểm tra desktop 1440px, mobile 390px và chụp ảnh vào `docs/screenshots/roles-admin-*.png`, `docs/screenshots/chat-stable-order-desktop.png`.
- Script dùng `ADMIN_UI_PREVIEW_URL` (mặc định `http://127.0.0.1:4220`) và `PLAYWRIGHT_MODULE_PATH` để trỏ đến Playwright Core có sẵn.

Chưa kiểm thử thao tác phân quyền với BE/database thật trong phiên này. Source BE không bị chỉnh sửa bởi phần triển khai giao diện.
