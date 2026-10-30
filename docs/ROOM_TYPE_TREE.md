# Cây loại phòng

Admin `/admin/room-types` tải toàn bộ danh mục qua `RoomTypeService.getAllRoomTypes()` (gom đủ các trang của API filter), dựng cây bằng parentId. Không phân trang riêng làm tách cha/con. Mỗi nút có thu gọn/mở rộng, thêm con, sửa, xóa; thêm loại gốc dùng nút đầu trang. Thêm con điền sẵn parentId; sửa loại cha loại bỏ chính nút và toàn bộ hậu duệ khỏi lựa chọn cha. Xóa vẫn có xác nhận và hiển thị lỗi BE khi loại có con hoặc đang được sử dụng.

Tìm kiếm theo tên/mô tả giữ các nhánh cha dẫn đến kết quả. Khi tìm, các nhánh phù hợp được mở để thấy kết quả. Dữ liệu thiếu cha hoặc có vòng lặp cũ được giữ để admin có thể sửa, không lặp vô hạn.

Trang chủ có bộ chọn cây thu gọn và đánh dấu loại đang chọn. Chọn một nút lọc theo đúng tên loại đó qua hợp đồng roomTypeName hiện tại, không tự gộp tất cả hậu duệ. Ô chọn loại phòng trong tìm kiếm/bộ lọc hiển thị đường dẫn `Cha › Con › Cháu`. Trang công khai không có thao tác quản trị.

Không thay đổi API/schema. Component dùng model RoomType đã qua mapper/service, tách TS/HTML/SCSS, OnPush và CSS variables theo docs/RULE.md.

Kiểm chứng 27/10/2026: production build thành công; 72 test FE qua trong 16 file, loại trừ app.spec.ts scaffold cũ. Smoke Edge chạy production app qua Postman simulation: cây 3 cấp, thêm/sửa/xóa, parent mặc định, ngăn cha vòng lặp, lỗi 409, tìm kiếm, thu gọn, chọn loại ở trang chủ, đường dẫn trong select và mobile 390px không tràn ngang. Đây là bằng chứng FE/HTTP với dữ liệu mô phỏng, không phải kiểm tra database/JWT thật.

Chạy lại theo docs/PROPERTY_UI.md, sau đó `node postman/simulations/rental-room-type-tree.smoke.cjs` (cần Playwright + Edge; PLAYWRIGHT_MODULE_PATH nếu module nằm ngoài repo).

Ảnh: [Admin](screenshots/room-type-tree-admin.png), [trang chủ](screenshots/room-type-tree-public.png), [mobile](screenshots/room-type-tree-mobile.png).


## Thu gọn bộ chọn trang chủ

Thanh loại phòng gồm nút Tất cả và các nhóm gốc để chọn nhanh. Nút “Xem tất cả loại” mở hộp chọn nổi rộng tối đa 368px, không đẩy nội dung trang. Cây công khai dùng dòng gọn, bỏ thẻ/khung/mô tả dài, có ô tìm nhanh và dấu chọn. Chọn loại hoặc Xem tất cả tin tự đóng; Escape, nút đóng và bấm ngoài đều đóng, focus trả về nút mở. CDK Overlay định vị trong màn hình và giữ thao tác bàn phím trong hộp chọn.

Kiểm chứng: build thành công, 72 test FE qua (loại trừ scaffold app.spec.ts); `rental-room-type-picker.smoke.cjs` qua với API Postman mô phỏng, gồm vị trí nội dung không đổi khi mở, tìm theo nhánh, tự đóng sau chọn, Escape/bấm ngoài và viewport 390px. Hâm nóng API mô phỏng trước khi mở app để tránh lỗi khởi tạo bảng pm.state khi các request đầu chạy đồng thời.

Ảnh cập nhật: [desktop](screenshots/room-type-picker-desktop.png), [mobile](screenshots/room-type-picker-mobile.png).
