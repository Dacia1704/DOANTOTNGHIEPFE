# Cơ sở và phòng cho thuê — FE

## Màn hình

- `/phong-cua-toi`: một màn quản lý cho LANDLORD. Ban đầu chỉ có danh sách cơ sở; bấm một cơ sở để chuyển sang chi tiết, có nút quay về danh sách. Chi tiết tải lại bằng GET properties/{id}, không dùng phòng của cơ sở khác. Thuê lẻ hiện phòng nhóm theo tầng và bộ lọc; nguyên căn hiện giá/diện tích/sức chứa/chi phí căn nhà, không hiện danh sách Room hay mã phòng. Form chỉnh sửa và nhãn trường tự đổi theo hình thức cho thuê.
- `/phong-cua-toi/tat-ca`: URL cũ chuyển hướng về màn cơ sở duy nhất; không còn nút hoặc menu mở một trang quản lý phòng tách riêng.
- `/admin/property-types`: ADMIN thêm/sửa/xóa danh mục loại cơ sở. Không dùng RoomType làm PropertyType; không có cây cha/con hoặc CRUD rental mode.

Thuê nguyên căn chỉ nhập thông tin, giá thuê và tiện ích căn nhà; FE tự gửi đúng một Room nội bộ, không yêu cầu mã phòng/tầng hay tùy chỉnh từng phòng. Chuyển sang BY_ROOM mới hiện danh sách phòng; đổi qua lại giữ bản nháp nhưng WHOLE không gửi các override từ bản nháp phòng.

Tạo cơ sở gồm ba bước: thông tin chung → mặc định và từng phòng → xem lại giá/phí cuối cùng. Mỗi component có TS/HTML/SCSS riêng, OnPush, CSS tokens từ styles.scss; DTO nằm trong request/response, service map sang model trước khi trả component.

## Quy tắc dữ liệu

- Tầng trệt là `0`; tầng null được hiển thị “Chưa ghi nhận tầng”, không suy luận từ mã phòng.
- RoomNumber được nhập explicit, giữ chuỗi như A101, P01. Chặn trùng sau trim và không phân biệt hoa thường trong cùng cơ sở; BE vẫn kiểm tra unique.
- Null override dùng mặc định; 0 là giá trị thật cho phí. Phí không khai báo hiển thị “Chưa khai báo”, 0 hiển thị “Miễn phí”; không ép tất cả thành 0 khi sửa.
- Địa chỉ/chủ sở hữu lấy từ Property; form Room chỉ gửi propertyId, roomNumber, floorNumber và thông số riêng. Tiện ích chung và riêng độc lập.
- WHOLE có một Room, không hiện nút thêm phòng và không cho xóa Room đại diện. BY_ROOM cũng giữ ít nhất một Room.
- Thống kê trên màn chính chỉ tính các Room của cơ sở đang chọn; tổng số cơ sở lấy từ totalElements của API. Thuê nguyên căn hiển thị trạng thái căn nhà thay vì thống kê số Room nội bộ.
- Danh mục loại cơ sở, loại phòng, tiện ích và phường/xã được tải hết các trang, không cắt ở 100 dòng. Đổi tỉnh hủy request phường cũ và xóa lựa chọn phường trước đó.
- Không tự nhóm dữ liệu cũ theo địa chỉ. Property có tên tự sinh “Cơ sở <UUID>” hiển thị theo địa chỉ để dễ nhận biết; loại chuyển đổi hiển thị “Chưa phân loại”. Đây chỉ là cách trình bày, không sửa dữ liệu trong DB. Không đưa loại chuyển đổi tạm vào lựa chọn tạo cơ sở mới.
- API lỗi giữ nguyên bản nháp, hiển thị lỗi và cho người dùng tự gửi lại; không tự retry POST. Khi đang lưu, dialog chặn đóng và nút gửi bị khóa.
- UI dùng API thật qua environment.apiUrl. Dữ liệu mô phỏng chỉ nằm trong `postman/`, không import vào code ứng dụng.

## Contract BE

Xem `DOANTOTNGHIEPBE/docs/PROPERTY_API.md`. FE gọi GET/POST properties, GET properties/mine, CRUD property-types và giữ PUT/multipart POST rooms hiện tại. Không bổ sung thao tác sửa/xóa Property hoặc upload ảnh chung khi BE chưa hỗ trợ. Ảnh riêng vẫn dùng các dialog Room hiện có.

## Kiểm chứng (27/10/2026)

- `npm run build`: production build qua, không lỗi Angular/TypeScript/template.
- `npm test -- --watch=false --exclude=src/app/app.spec.ts`: 57 test qua trong 10 file, gồm các test mới về mặc định/override, phí null/0, tầng 0/null, trùng phòng, validation, WHOLE và giữ bản nháp khi lỗi.
- Lần chạy cả suite có 53 test qua, 1 test scaffold cũ lỗi ở `src/app/app.spec.ts`: còn tìm h1 “Hello, library-frontend” trong khi app.html hiện chỉ có router-outlet. Không sửa test ngoài phạm vi tính năng.
- Playwright + Edge chạy app production qua HTTP với Postman simulation: chọn cơ sở, lọc phòng, WHOLE, tạo nhiều phòng, trùng mã, quay lại form, API 503 giữ bản nháp, retry thành công, đọc lại dữ liệu, cập nhật phòng, CRUD loại cơ sở và lỗi 409 khi loại đang sử dụng. Không có pageerror; chiều rộng 390px không tràn ngang.
- Kiểm tra trình duyệt trên backend mô phỏng là bằng chứng FE/HTTP và trải nghiệm, chưa phải kiểm thử end-to-end với BE đang triển khai. Test BE và migration nằm ở báo cáo task BE riêng.

Ảnh giao diện dùng dữ liệu mô phỏng: [desktop](screenshots/property-management.png), [xem lại trước khi tạo](screenshots/property-review.png), [mobile](screenshots/property-mobile.png).

## Chạy lại smoke test

Cần Postman CLI >= 1.70 và Playwright có Edge (`npm install --no-save --package-lock=false playwright` nếu chưa cài).

```powershell
npm run build
# Terminal 1
postman simulation run postman/simulations/rental-property-ui.sim.yaml --port 4907 --output ndjson --no-history
# Terminal 2: server chỉ bind 127.0.0.1, proxy /api vào simulation.
node postman/simulations/rental-property-preview.cjs
# Terminal 3
node postman/simulations/rental-property-ui.smoke.cjs
node postman/simulations/rental-property-admin.smoke.cjs
```

Nếu Playwright được cài bên ngoài repo, có thể đặt PLAYWRIGHT_MODULE_PATH tới module playwright. Test chỉ mở server loopback và dùng session giả cho mô phỏng, không cần mật khẩu thật. Ảnh tạm và log nằm trong `.angular/property-*` (gitignored). Các route `/test/reset` và `/test/fail-next` chỉ tồn tại trong mock. Dừng hai server bằng Ctrl+C khi xong.

## Hiển thị theo bài đăng

Thêm cơ sở/phòng chỉ tạo dữ liệu quản lý riêng. Nút “Quản lý bài đăng cho thuê” dẫn đến `/tin-cua-toi`; `/dang-tin` cũng chuyển về đây. Chủ trọ tạo tin và gửi duyệt, admin duyệt thì tin mới xuất hiện trên trang công khai. Admin xem toàn bộ bài đăng qua `/admin/listings`, không xem danh sách Room chưa tạo tin. Màn loại phòng chỉ còn CRUD danh mục, đã bỏ tab liệt kê Room.

Trang chủ lấy `/api/listings`, không gọi `/api/rooms/mine/filter`. Tiêu đề, mô tả và ngày đăng lấy từ Listing; giá, ảnh và các phòng lấy từ `listing.property`. Chi tiết kiểm tra lại tin qua `/api/listings/{id}` để không mở tin vừa ẩn/hết hạn. Tìm kiếm và phân trang được áp dụng trên các tin PUBLISHED còn hạn tại BE.

Kiểm chứng bổ sung: 62 test FE qua (vẫn loại trừ app.spec.ts scaffold cũ), 72 test API BE/MySQL tách riêng qua. Smoke test trình duyệt: `postman/simulations/rental-listing-ui.smoke.cjs` với Postman simulation đã có. Ảnh dùng fixture mô phỏng: [trang công khai](screenshots/published-listings.png), [admin quản lý bài đăng](screenshots/admin-listings.png). Quy tắc API chi tiết: `DOANTOTNGHIEPBE/docs/LISTING_VISIBILITY.md`.

## Đăng tin theo cơ sở

Form đăng tin chọn cơ sở qua `propertyId`. Mỗi tin chứa `property` và danh sách phòng; không gửi ID phòng đại diện. Trang chủ hiển thị một thẻ cho mỗi cơ sở đã có tin được duyệt: nguyên căn hiện giá cả căn, theo phòng hiện giá từ mức thấp nhất trong các phòng AVAILABLE (hoặc toàn bộ phòng nếu không còn phòng trống).

Chi tiết công khai hiển thị ảnh/tiện ích chung và các phòng theo tầng. Bấm tên hoặc nút xem phòng để mở ảnh, giá, tiền cọc, chi phí và tiện ích riêng của đúng phòng đó. Không có thao tác sửa/xóa trong màn công khai. Nguyên căn hiển thị thông tin cả nhà, không có bảng phòng. Tài sản chưa đăng hoặc tin chờ duyệt không xuất hiện.

Hợp đồng `listing.room` ở phần trước đã được thay bằng `listing.property.rooms`. BE dùng migration V13 chuyển liên kết tin sang cơ sở; lịch sử vẫn được giữ. Kiểm chứng FE: 66 test qua trong 14 file (loại trừ app.spec.ts scaffold cũ), production build thành công. Smoke trình duyệt dùng dữ liệu Postman mô phỏng, không phải database ứng dụng.

Smoke trình duyệt đã qua: hai cơ sở với bảy Room chỉ có hai thẻ; mở B201 đúng giá; nguyên căn không có bảng phòng; tạo cơ sở chưa đăng không xuất hiện; gửi propertyId và duyệt tin mới tăng đúng một thẻ. Ảnh mô phỏng: [chi tiết cơ sở](screenshots/property-listing-detail.png).
