# Giao diện hợp đồng thuê phòng

Trang `/hop-dong/:id` dùng bố cục tài liệu và thanh thông tin bên cạnh: trạng thái/hạn xác nhận, tóm tắt phòng và hai bên, PDF, chi phí và tiến trình xác nhận. Người thuê xem tài liệu, tích đồng ý rồi xác nhận; chủ trọ xem trạng thái người thuê và chỉ có thao tác hoàn tất trả phòng khi API cho phép. Màu sắc dùng design tokens hiện có. Danh sách hợp đồng trong `/yeu-cau-thue` và `/quan-ly-dat-phong` có thẻ hợp đồng, thông tin đối tác, tiền thuê, thời hạn và trạng thái riêng.

PDF vẫn do JasperReports tại BE tạo. FE xác minh SHA-256 của Blob trước khi hiển thị, dùng PDF.js tải động để đọc chính Blob đó trong trình duyệt, có chuyển trang/phóng to/thu nhỏ/vừa chiều rộng. Không gửi PDF sang dịch vụ khác. Xác nhận chỉ được bật khi PDF đã xác minh, hiển thị được và người thuê tích đồng ý. Tải xuống/mở tab mới giữ nguyên bytes PDF gốc. Có text tương ứng với trang PDF cho trình đọc màn hình.

`pdf.worker.min.mjs` được sao chép từ phiên bản `pdfjs-dist` đã ghim vào `assets/pdfjs/` khi build. `nginx.conf` và preview server phục vụ đúng MIME cho ES module; Nginx yêu cầu revalidate worker để tránh lệch phiên bản sau cập nhật. Trạng thái loading, lỗi API, PDF đang tạo, tạo thất bại và danh sách trống đều có giao diện riêng. Mobile 390px xếp nội dung một cột, công cụ PDF cuộn bên trong, không làm tràn trang.

## Kiểm chứng ngày 01/11/2026

- `npm run build`: production build thành công, PDF.js nằm ở lazy chunk.
- `npx ng test --watch=false`: 99 test trong 23 file qua. Warning polyfills có sẵn trong cấu hình test, không liên quan thay đổi hợp đồng.
- `postman/simulations/rental-agreement-ui.smoke.cjs`: production Angular + Edge qua HTTP, hai vai trò, PDF hai trang/zoom/fit, download đúng bytes, hash lỗi không cho xác nhận, retry, đồng ý/hủy dialog, ACTIVE, checkout, danh sách, PROCESSING/FAILED và không tràn ngang ở 390px. Không có runtime pageerror.

Ảnh dùng dữ liệu tổng hợp: [người thuê](screenshots/contract_tenant_desktop.png), [chủ trọ](screenshots/contract_landlord_desktop.png), [mobile](screenshots/contract_tenant_mobile.png), [danh sách](screenshots/contracts_landlord_list.png).

Đây là kiểm thử FE với API mô phỏng dựa trên Java `RentalAgreementResponse` và các endpoint đã có. Không xác lập JWT/ownership, transaction, MySQL hoặc Cloudinary của môi trường thật. Mock chỉ chạy local, dùng file PDF Jasper mẫu, không dùng để deploy một mock server công khai. Không tìm mock của đội khác vì API thuộc BE trong cùng workspace.

## Chạy lại kiểm tra trình duyệt

Cần Postman CLI >= 1.70, Playwright và Edge đã cài. Nếu Playwright nằm ngoài repo, đặt `PLAYWRIGHT_MODULE_PATH` tới module đó.

```powershell
npm run build
# Terminal 1
postman simulation run postman/simulations/rental-agreement-ui.sim.yaml --port 4917 --output ndjson --no-history
# Terminal 2
$env:RENTAL_PREVIEW_PORT='4227'
$env:RENTAL_BACKEND_PORT='4917'
node scripts/rental-e2e-preview.cjs
# Terminal 3
node postman/simulations/rental-agreement-ui.smoke.cjs
```

Các tài khoản trong simulation là role token tổng hợp, không phải tài khoản ứng dụng. Script chỉ reset/ghi state của mock. Dừng hai server local sau khi kiểm tra. Context và giới hạn của simulation được lưu tại `postman/simulations/rental-agreement-ui.context.yaml`.
