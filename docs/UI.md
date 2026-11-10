# Hướng dẫn giao diện frontend

[Mục lục](../README.md) · [Quy tắc](RULE.md) · [API chung tại BE](../../RentalManagement/docs/api.md)

Các mục kiểm chứng có ngày/số lượng bên dưới ghi nhận lịch sử triển khai; không phải kết quả chạy lại khi hợp nhất tài liệu. Smoke có API mô phỏng chỉ kiểm tra FE/HTTP, không xác lập JWT, transaction hoặc database thật.

| Chủ đề | Nội dung |
| --- | --- |
| [Cơ sở và tin đăng](#co-so) | Quản lý tài sản, dữ liệu phòng, đăng tin và smoke Postman |
| [Cây loại phòng](#loai-phong) | Danh mục admin và bộ chọn công khai |
| [Bản đồ](#ban-do) | Cấu hình MapTiler, tọa độ và tìm kiếm |
| [Hợp đồng](#hop-dong) | PDF, kiểm tra hash và xác nhận |
| [Review và Report](#review-report) | Đánh giá, minh chứng và xử lý báo cáo |
| [Phân quyền và Chat](#phan-quyen-chat) | Ma trận quyền, authority và thứ tự hội thoại |



<a id="co-so"></a>

## Cơ sở và phòng cho thuê — FE

### Màn hình

- `/phong-cua-toi`: một màn quản lý cho LANDLORD. Ban đầu chỉ có danh sách cơ sở; bấm một cơ sở để chuyển sang chi tiết, có nút quay về danh sách. Chi tiết tải lại bằng GET properties/{id}, không dùng phòng của cơ sở khác. Thuê lẻ hiện phòng nhóm theo tầng và bộ lọc; nguyên căn hiện giá/diện tích/sức chứa/chi phí căn nhà, không hiện danh sách Room hay mã phòng. Form chỉnh sửa và nhãn trường tự đổi theo hình thức cho thuê.
- `/phong-cua-toi/tat-ca`: URL cũ chuyển hướng về màn cơ sở duy nhất; không còn nút hoặc menu mở một trang quản lý phòng tách riêng.
- `/admin/property-types`: ADMIN thêm/sửa/xóa danh mục loại cơ sở. Không dùng RoomType làm PropertyType; không có cây cha/con hoặc CRUD rental mode.

Thuê nguyên căn chỉ nhập thông tin, giá thuê và tiện ích căn nhà; FE tự gửi đúng một Room nội bộ, không yêu cầu mã phòng/tầng hay tùy chỉnh từng phòng. Chuyển sang BY_ROOM mới hiện danh sách phòng; đổi qua lại giữ bản nháp nhưng WHOLE không gửi các override từ bản nháp phòng.

Tạo cơ sở gồm ba bước: thông tin chung → mặc định và từng phòng → xem lại giá/phí cuối cùng. Mỗi component có TS/HTML/SCSS riêng, OnPush, CSS tokens từ styles.scss; DTO nằm trong request/response, service map sang model trước khi trả component.

### Quy tắc dữ liệu

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

### Contract BE

Xem [Property API](../../RentalManagement/docs/api.md#property-api). FE gọi GET/POST properties, GET properties/mine, CRUD property-types và giữ PUT/multipart POST rooms hiện tại. Cập nhật địa chỉ/tọa độ dùng API location; không giả định BE đã hỗ trợ sửa toàn bộ hoặc xóa Property/upload ảnh chung. Ảnh riêng vẫn dùng các dialog Room hiện có.

### Kiểm chứng (27/10/2026)

- `npm run build`: production build qua, không lỗi Angular/TypeScript/template.
- `npm test -- --watch=false --exclude=src/app/app.spec.ts`: 57 test qua trong 10 file, gồm các test mới về mặc định/override, phí null/0, tầng 0/null, trùng phòng, validation, WHOLE và giữ bản nháp khi lỗi.
- Lần chạy cả suite có 53 test qua, 1 test scaffold cũ lỗi ở `src/app/app.spec.ts`: còn tìm h1 “Hello, library-frontend” trong khi app.html hiện chỉ có router-outlet. Không sửa test ngoài phạm vi tính năng.
- Playwright + Edge chạy app production qua HTTP với Postman simulation: chọn cơ sở, lọc phòng, WHOLE, tạo nhiều phòng, trùng mã, quay lại form, API 503 giữ bản nháp, retry thành công, đọc lại dữ liệu, cập nhật phòng, CRUD loại cơ sở và lỗi 409 khi loại đang sử dụng. Không có pageerror; chiều rộng 390px không tràn ngang.
- Kiểm tra trình duyệt trên backend mô phỏng là bằng chứng FE/HTTP và trải nghiệm, chưa phải kiểm thử end-to-end với BE đang triển khai. Test BE và migration nằm ở báo cáo task BE riêng.

Ảnh giao diện dùng dữ liệu mô phỏng: [desktop](screenshots/property-management.png), [xem lại trước khi tạo](screenshots/property-review.png), [mobile](screenshots/property-mobile.png).

### Chạy lại smoke test

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

### Hiển thị theo bài đăng

Thêm cơ sở/phòng chỉ tạo dữ liệu quản lý riêng. Nút “Quản lý bài đăng cho thuê” dẫn đến `/tin-cua-toi`; `/dang-tin` cũng chuyển về đây. Chủ trọ tạo tin và gửi duyệt, admin duyệt thì tin mới xuất hiện trên trang công khai. Admin xem toàn bộ bài đăng qua `/admin/listings`, không xem danh sách Room chưa tạo tin. Màn loại phòng chỉ còn CRUD danh mục, đã bỏ tab liệt kê Room.

Trang chủ lấy `/api/listings`, không gọi `/api/rooms/mine/filter`. Tiêu đề, mô tả và ngày đăng lấy từ Listing; giá, ảnh và các phòng lấy từ `listing.property`. Chi tiết kiểm tra lại tin qua `/api/listings/{id}` để không mở tin vừa ẩn/hết hạn. Tìm kiếm và phân trang được áp dụng trên các tin PUBLISHED còn hạn tại BE.

Kiểm chứng bổ sung: 62 test FE qua (vẫn loại trừ app.spec.ts scaffold cũ), 72 test API BE/MySQL tách riêng qua. Smoke test trình duyệt: `postman/simulations/rental-listing-ui.smoke.cjs` với Postman simulation đã có. Ảnh dùng fixture mô phỏng: [trang công khai](screenshots/published-listings.png), [admin quản lý bài đăng](screenshots/admin-listings.png). Quy tắc API chi tiết: [nghiệp vụ tin đăng](../../RentalManagement/docs/BUSINESS.md).

### Đăng tin theo cơ sở

Form đăng tin chọn cơ sở qua `propertyId`. Mỗi tin chứa `property` và danh sách phòng; không gửi ID phòng đại diện. Trang chủ hiển thị một thẻ cho mỗi cơ sở đã có tin được duyệt: nguyên căn hiện giá cả căn, theo phòng hiện giá từ mức thấp nhất trong các phòng AVAILABLE (hoặc toàn bộ phòng nếu không còn phòng trống).

Chi tiết công khai hiển thị ảnh/tiện ích chung và các phòng theo tầng. Bấm tên hoặc nút xem phòng để mở ảnh, giá, tiền cọc, chi phí và tiện ích riêng của đúng phòng đó. Không có thao tác sửa/xóa trong màn công khai. Nguyên căn hiển thị thông tin cả nhà, không có bảng phòng. Tài sản chưa đăng hoặc tin chờ duyệt không xuất hiện.

Tin dùng `listing.property.rooms`; lịch sử chuyển liên kết sang cơ sở đã được gộp vào schema hiện tại. Kiểm chứng FE: 66 test qua trong 14 file (loại trừ app.spec.ts scaffold cũ), production build thành công. Smoke trình duyệt dùng dữ liệu Postman mô phỏng, không phải database ứng dụng.

Smoke trình duyệt đã qua: hai cơ sở với bảy Room chỉ có hai thẻ; mở B201 đúng giá; nguyên căn không có bảng phòng; tạo cơ sở chưa đăng không xuất hiện; gửi propertyId và duyệt tin mới tăng đúng một thẻ. Ảnh mô phỏng: [chi tiết cơ sở](screenshots/property-listing-detail.png).

<a id="loai-phong"></a>

## Cây loại phòng

Admin `/admin/room-types` tải toàn bộ danh mục qua `RoomTypeService.getAllRoomTypes()` (gom đủ các trang của API filter), dựng cây bằng parentId. Không phân trang riêng làm tách cha/con. Mỗi nút có thu gọn/mở rộng, thêm con, sửa, xóa; thêm loại gốc dùng nút đầu trang. Thêm con điền sẵn parentId; sửa loại cha loại bỏ chính nút và toàn bộ hậu duệ khỏi lựa chọn cha. Xóa vẫn có xác nhận và hiển thị lỗi BE khi loại có con hoặc đang được sử dụng.

Tìm kiếm theo tên/mô tả giữ các nhánh cha dẫn đến kết quả. Khi tìm, các nhánh phù hợp được mở để thấy kết quả. Dữ liệu thiếu cha hoặc có vòng lặp cũ được giữ để admin có thể sửa, không lặp vô hạn.

Trang chủ có bộ chọn cây thu gọn và đánh dấu loại đang chọn. Chọn một nút lọc theo đúng tên loại đó qua hợp đồng roomTypeName hiện tại, không tự gộp tất cả hậu duệ. Ô chọn loại phòng trong tìm kiếm/bộ lọc hiển thị đường dẫn `Cha › Con › Cháu`. Trang công khai không có thao tác quản trị.

Không thay đổi API/schema. Component dùng model RoomType đã qua mapper/service, tách TS/HTML/SCSS, OnPush và CSS variables theo docs/RULE.md.

Kiểm chứng 27/10/2026: production build thành công; 72 test FE qua trong 16 file, loại trừ app.spec.ts scaffold cũ. Smoke Edge chạy production app qua Postman simulation: cây 3 cấp, thêm/sửa/xóa, parent mặc định, ngăn cha vòng lặp, lỗi 409, tìm kiếm, thu gọn, chọn loại ở trang chủ, đường dẫn trong select và mobile 390px không tràn ngang. Đây là bằng chứng FE/HTTP với dữ liệu mô phỏng, không phải kiểm tra database/JWT thật.

Chạy lại theo [hướng dẫn smoke cơ sở](#co-so), sau đó `node postman/simulations/rental-room-type-tree.smoke.cjs` (cần Playwright + Edge; PLAYWRIGHT_MODULE_PATH nếu module nằm ngoài repo).

Ảnh: [Admin](screenshots/room-type-tree-admin.png), [trang chủ](screenshots/room-type-tree-public.png), [mobile](screenshots/room-type-tree-mobile.png).


### Thu gọn bộ chọn trang chủ

Thanh loại phòng gồm nút Tất cả và các nhóm gốc để chọn nhanh. Nút “Xem tất cả loại” mở hộp chọn nổi rộng tối đa 368px, không đẩy nội dung trang. Cây công khai dùng dòng gọn, bỏ thẻ/khung/mô tả dài, có ô tìm nhanh và dấu chọn. Chọn loại hoặc Xem tất cả tin tự đóng; Escape, nút đóng và bấm ngoài đều đóng, focus trả về nút mở. CDK Overlay định vị trong màn hình và giữ thao tác bàn phím trong hộp chọn.

Kiểm chứng: build thành công, 72 test FE qua (loại trừ scaffold app.spec.ts); `rental-room-type-picker.smoke.cjs` qua với API Postman mô phỏng, gồm vị trí nội dung không đổi khi mở, tìm theo nhánh, tự đóng sau chọn, Escape/bấm ngoài và viewport 390px. Hâm nóng API mô phỏng trước khi mở app để tránh lỗi khởi tạo bảng pm.state khi các request đầu chạy đồng thời.

Ảnh cập nhật: [desktop](screenshots/room-type-picker-desktop.png), [mobile](screenshots/room-type-picker-mobile.png).

<a id="ban-do"></a>

## Bản đồ MapTiler + MapLibre GL JS

Frontend dùng `maplibre-gl` để hiển thị bản đồ vector 2D, MapTiler Cloud để tải style/tiles và tìm địa điểm. Không tải Google Maps SDK hoặc gọi Google Places. Nút chỉ đường mở OpenStreetMap.

### Cấu hình

Chỉnh `src/environments/maptiler.config.ts`:

```typescript
export const mapTilerConfig = {
  apiKey: 'YOUR_MAPTILER_BROWSER_KEY',
  style: 'streets-v2', // Hoặc ID bản đồ tùy chỉnh trong MapTiler Cloud
  language: 'vi',
  markerColor: '#006b5e',
  radiusColor: '#00897b',
};
```

Cấu hình áp dụng cho development, production và Docker; build lại sau khi đổi. Đây là key trình duyệt, hiển thị trong các yêu cầu mạng. Giới hạn allowed origins trong MapTiler Cloud cho `http://localhost:4200` và tên miền triển khai. Giữ attribution MapTiler/OpenStreetMap trên bản đồ.

`language` ưu tiên thuộc tính `name:vi` của vector tiles, dùng tên địa phương khi không có bản dịch. Không phải mọi địa danh đều có bản dịch tiếng Việt. Style tùy chỉnh nên dùng schema tên tương thích MapTiler. Có thể thay màu nền, đường, khu dân cư trong MapTiler Cloud rồi đổi `style`.

### Các điểm sử dụng

- Chi tiết tin và admin: hiển thị vị trí cơ sở, marker, popup và liên kết chỉ đường. Cơ sở thiếu tọa độ giữ địa chỉ, không tự suy đoán ghim.
- Tạo/sửa cơ sở: tìm địa điểm, chọn hoặc kéo ghim, dùng vị trí hiện tại, nhập tọa độ thủ công hoặc xóa ghim. Gợi ý đường/địa chỉ có thể điền địa chỉ cụ thể; tỉnh/phường luôn dùng ID danh mục backend.
- Tìm phòng: giữ bộ lọc khung bản đồ, bán kính quanh địa điểm hoặc vị trí hiện tại. Vòng bán kính được dựng theo khoảng cách trên mặt đất, đơn vị km.
- Tìm địa điểm giới hạn Việt Nam, ưu tiên tiếng Việt; chờ 350 ms sau khi gõ và hủy yêu cầu cũ khi đổi nội dung/ngữ cảnh hoặc đóng component.

SDK được tải bằng dynamic import khi mở bản đồ. MapLibre v6 dùng module worker riêng; `angular.json` sao chép worker và shared module vào `assets/maplibre`, service cấu hình URL theo base URL của ứng dụng. Map, marker, popup và observer được giải phóng khi đóng. Thiếu key, lỗi mạng, lỗi tải style và timeout có thông báo cùng nút thử lại. Địa chỉ và nhập tọa độ thủ công vẫn sử dụng được.

### Hợp đồng dữ liệu

- Tọa độ thuộc Property, các tin/phòng cùng cơ sở dùng chung vị trí. Số 0 hợp lệ; thiếu tọa độ không tự thay bằng một vị trí giả.
- Khung bản đồ gửi `south`, `north`, `west`, `east`, hỗ trợ qua kinh tuyến 180°. Bán kính gửi `latitude`, `longitude`, `radiusKm`.
- Đổi chế độ loại bỏ tham số của chế độ trước, giữ bộ lọc giá/tiện ích/khu vực. Kéo bản đồ chờ 450 ms trước khi tìm.
- Tổng số tin, phân trang và thứ tự do backend trả về. Ghim thể hiện trang hiện tại.
- Chỉ xin quyền định vị khi bấm nút; từ chối quyền vẫn chọn ghim thủ công được.

### Kiểm tra

Chạy `npm test -- --watch=false` và `npm run build`. Kiểm thử bản đồ dùng SDK/fetch giả lập, không gọi dịch vụ MapTiler thật. Kiểm tra trực tiếp với key: chi tiết tin trên desktop/mobile, popup, tìm địa điểm, kéo ghim, bán kính, lỗi mạng và thử tải lại.

Tài liệu: [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/), [MapTiler Geocoding](https://docs.maptiler.com/cloud/api/geocoding/).

<a id="hop-dong"></a>

## Giao diện hợp đồng thuê phòng

Trang `/hop-dong/:id` dùng bố cục tài liệu và thanh thông tin bên cạnh: trạng thái/hạn xác nhận, tóm tắt phòng và hai bên, PDF, chi phí và tiến trình xác nhận. Người thuê xem tài liệu, tích đồng ý rồi xác nhận; chủ trọ xem trạng thái người thuê và chỉ có thao tác hoàn tất trả phòng khi API cho phép. Màu sắc dùng design tokens hiện có. Danh sách hợp đồng trong `/yeu-cau-thue` và `/quan-ly-dat-phong` có thẻ hợp đồng, thông tin đối tác, tiền thuê, thời hạn và trạng thái riêng.

PDF vẫn do JasperReports tại BE tạo. FE xác minh SHA-256 của Blob trước khi hiển thị, dùng PDF.js tải động để đọc chính Blob đó trong trình duyệt, có chuyển trang/phóng to/thu nhỏ/vừa chiều rộng. Không gửi PDF sang dịch vụ khác. Xác nhận chỉ được bật khi PDF đã xác minh, hiển thị được và người thuê tích đồng ý. Tải xuống/mở tab mới giữ nguyên bytes PDF gốc. Có text tương ứng với trang PDF cho trình đọc màn hình.

`pdf.worker.min.mjs` được sao chép từ phiên bản `pdfjs-dist` đã ghim vào `assets/pdfjs/` khi build. `nginx.conf` và preview server phục vụ đúng MIME cho ES module; Nginx yêu cầu revalidate worker để tránh lệch phiên bản sau cập nhật. Trạng thái loading, lỗi API, PDF đang tạo, tạo thất bại và danh sách trống đều có giao diện riêng. Mobile 390px xếp nội dung một cột, công cụ PDF cuộn bên trong, không làm tràn trang.

### Kiểm chứng ngày 01/11/2026

- `npm run build`: production build thành công, PDF.js nằm ở lazy chunk.
- `npx ng test --watch=false`: 99 test trong 23 file qua. Warning polyfills có sẵn trong cấu hình test, không liên quan thay đổi hợp đồng.
- `postman/simulations/rental-agreement-ui.smoke.cjs`: production Angular + Edge qua HTTP, hai vai trò, PDF hai trang/zoom/fit, download đúng bytes, hash lỗi không cho xác nhận, retry, đồng ý/hủy dialog, ACTIVE, checkout, danh sách, PROCESSING/FAILED và không tràn ngang ở 390px. Không có runtime pageerror.

Ảnh dùng dữ liệu tổng hợp: [người thuê](screenshots/contract_tenant_desktop.png), [chủ trọ](screenshots/contract_landlord_desktop.png), [mobile](screenshots/contract_tenant_mobile.png), [danh sách](screenshots/contracts_landlord_list.png).

Đây là kiểm thử FE với API mô phỏng dựa trên Java `RentalAgreementResponse` và các endpoint đã có. Không xác lập JWT/ownership, transaction, MySQL hoặc Cloudinary của môi trường thật. Mock chỉ chạy local, dùng file PDF Jasper mẫu, không dùng để deploy một mock server công khai. Không tìm mock của đội khác vì API thuộc BE trong cùng workspace.

### Chạy lại kiểm tra trình duyệt

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

<a id="review-report"></a>

## Giao diện Review và Report

Triển khai theo source BE đối chiếu ngày 07/11/2026, `docs/RULE.md`, design tokens trong `src/styles.scss`.

### Điểm truy cập

- Người thuê: menu tài khoản → **Đánh giá của tôi** (`/danh-gia-cua-toi`) hoặc **Báo cáo của tôi** (`/bao-cao-cua-toi`). Tab đánh giá gồm phòng, chủ trọ và đánh giá về chính người thuê.
- Hợp đồng: phần **Đánh giá từ hợp đồng** tại `/hop-dong/:id` và `/landlord/agreements/:id`. Điều kiện gửi từng loại được lấy từ BE. Người thuê có thể báo cáo chủ trọ đã có hợp đồng xác nhận; chủ trọ có thể xem nhận xét về người thuê.
- Chi tiết tin: **Báo cáo tin đăng**, **Báo cáo chủ trọ**; khách đăng nhập và giữ URL quay lại. Đánh giá công khai có lựa chọn phòng hiện tại hoặc toàn bộ cơ sở.
- Chủ trọ: sidebar → **Đánh giá & phản hồi** (`/landlord/reviews`), gồm đánh giá nhận được về phòng/chủ trọ và đánh giá đã viết về người thuê.
- Admin: sidebar → **Quản lý đánh giá** (`/admin/reviews`), **Quản lý báo cáo** (`/admin/reports`), chi tiết tại `/admin/reports/:id`.

### Hành vi chính

Review sử dụng điều kiện từ `review-eligibility`, gửi độc lập theo loại và không cho gửi lại đánh giá đã tồn tại. Người thuê xem được lý do đánh giá của mình bị ẩn. Chủ trọ phản hồi theo `canReply`; admin ẩn kèm lý do hoặc khôi phục. Nội dung người dùng được hiển thị dưới dạng văn bản.

Report gồm hai bước: lưu nội dung báo cáo, sau đó bổ sung ảnh. ID báo cáo được giữ sau khi tạo thành công. Từng ảnh có trạng thái riêng và nút gửi lại khi lỗi; gửi lại ảnh không tạo báo cáo mới. FE kiểm tra JPEG/PNG, tối đa 5 MiB/ảnh, 4096 × 4096 px và 5 ảnh/báo cáo. BE tiếp tục kiểm tra dữ liệu thực và quyền upload.

Ảnh minh chứng được tải bằng HttpClient dưới dạng Blob theo report/evidence ID. Không sử dụng `contentUrl` từ response để gửi request có token. Object URL được thu hồi khi thay dữ liệu hoặc đóng giao diện.

Admin chỉ kết thúc báo cáo đã nhận xử lý bởi chính tài khoản hiện tại; ghi chú bắt buộc. Xung đột nhận xử lý làm mới hồ sơ và hiển thị lỗi. Danh sách và các bộ đếm được tải lại khi quay về. Bộ lọc/tab/trang được giữ trong query params.

Các trang nhiều vai trò dùng chung đặt trong `shared/pages`; services và DTO/model/mapper tách theo domain trong `core`. Mỗi component có đủ TS/HTML/SCSS, dùng OnPush và signals, hủy subscription theo lifecycle. Giao diện tái sử dụng dashboard, management table và pager hiện có. Đã bổ sung tải font Be Vietnam Pro vốn được khai báo trong design system.

### Kiểm tra

- Production build hoàn tất; cảnh báo còn lại thuộc các trang/style hiện có.
- 21 bài kiểm tra thuộc 9 spec liên quan đã qua: API, eligibility, phân quyền, tạo báo cáo một lần, xử lý xung đột, hợp đồng và tin đăng.
- `scripts/review-report-ui.smoke.cjs` chạy trên Edge với API fixtures theo contract BE: guest redirect, đánh giá và bàn phím chọn sao, upload lỗi/thử lại, tải Blob có xác thực, phản hồi, kiểm duyệt, kết thúc báo cáo và nhận xử lý đồng thời. Kiểm tra bố cục 1440px/390px, không tràn ngang trang và không có lỗi runtime.
- Ảnh kiểm tra lưu trong `docs/screenshots/report-*.png` và `docs/screenshots/review-*.png`.

Smoke script nhận `FEEDBACK_PREVIEW_URL` (mặc định `http://127.0.0.1:4219`) và `PLAYWRIGHT_MODULE_PATH` để sử dụng bản Playwright/Playwright Core có sẵn. Có thể phục vụ production build bằng `scripts/rental-e2e-preview.cjs` với `RENTAL_PREVIEW_PORT=4219`; smoke script chặn request API trong trình duyệt để không ghi dữ liệu vào BE.

Chưa xác nhận tích hợp trên BE đang chạy với database và dịch vụ lưu ảnh thật. Không thay đổi source BE; không thêm dependency ứng dụng.

<a id="phan-quyen-chat"></a>

## Phân quyền admin và thứ tự hội thoại

Ngày triển khai: 09/11/2026. Giao diện theo bố cục mẫu được cung cấp, dùng design tokens và font của Trọ Tốt trong `docs/RULE.md`, `src/styles.scss`.

### Phân quyền

Mở **Phân quyền & vai trò** trong sidebar admin hoặc `/admin/roles`.

- Ma trận lấy vai trò, danh sách quyền, trạng thái được cấp và các ô khóa từ `GET /api/admin/role-permissions`. Không sử dụng số lượng hoặc dữ liệu vai trò giả từ ảnh mẫu.
- Tìm theo mã/tên quyền hoặc tên vai trò; số quyền từng vai trò được tính từ dữ liệu BE. Tiêu đề và cột quyền được giữ khi cuộn bảng.
- Checkbox gửi `PATCH /api/admin/roles/{roleId}/permissions/{permissionId}` với `enabled`, `expectedVersion`. Chỉ cập nhật trạng thái và phiên bản sau phản hồi thành công. Khóa thao tác khi đang lưu; ô thuộc `lockedPermissionIds` luôn bị vô hiệu hóa.
- Khi gặp 409/403, tải lại ma trận và thông báo để người dùng kiểm tra. Không tự gửi lại thay đổi.
- Người không có `ROLE_PERMISSION_MANAGE` chỉ được xem. Quyền hiện tại được đồng bộ qua `/api/users/me/authorities` khi mở trang, chuyển trang admin, quay lại cửa sổ và sau cập nhật.
- Nhật ký dùng `/api/admin/role-permissions/audit`, phân trang theo khả năng API; không giả định có tổng số bản ghi.
- Các menu quản trị người dùng, review, report và phân quyền theo quyền đọc hiện tại. BE tiếp tục là nơi kiểm tra quyền thực tế.

### Chat

`ChatPageComponent` dùng chung cho trang tin nhắn và chat thu nhỏ. Chọn hội thoại đã có sẽ giữ vị trí trong danh sách; không đưa hội thoại đó lên đầu. Chuyển giữa các hội thoại đã tải không gọi lại danh sách, nên không chèn trạng thái loading làm xê dịch vị trí cuộn.

Vẫn tải lại khi người dùng yêu cầu hoặc mở đường dẫn tới hội thoại chưa có trong danh sách. Tin nhắn thực sự mới tiếp tục cập nhật nội dung xem trước và thứ tự theo thời gian.

### Kiểm tra

- Production build thành công; cảnh báo còn lại ở các trang/style có sẵn.
- 27 tests liên quan đã qua: API phân quyền, đồng bộ authority, khóa quyền, version, xung đột, tìm kiếm, thứ tự/vị trí cuộn chat, deep link và các kiểm tra admin/chat sẵn có.
- Browser smoke script: `scripts/roles-chat-ui.smoke.cjs`, sử dụng API fixtures theo contract BE và không ghi dữ liệu vào server. Kiểm tra desktop 1440px, mobile 390px và chụp ảnh vào `docs/screenshots/roles-admin-*.png`, `docs/screenshots/chat-stable-order-desktop.png`.
- Script dùng `ADMIN_UI_PREVIEW_URL` (mặc định `http://127.0.0.1:4220`) và `PLAYWRIGHT_MODULE_PATH` để trỏ đến Playwright Core có sẵn.

Chưa kiểm thử thao tác phân quyền với BE/database thật trong phiên này. Source BE không bị chỉnh sửa bởi phần triển khai giao diện.

## Phạm vi mở rộng cần API bổ sung

Không tự triển khai tìm kiếm/lọc sao/lọc ngày, phân công lại report hay sửa/xóa review khi chưa có contract. Muốn hiển thị điểm ở danh sách tin cần summary theo batch/response listing, không gọi API review riêng cho từng card hoặc dùng điểm mẫu. Nội dung người dùng hiển thị plain text; giữ trạng thái rỗng/lỗi riêng, hủy request cũ khi đổi đối tượng và không tự retry mutation.

## Thông báo

Chuông header dùng chung cho ba vai trò, tải inbox và số chưa đọc qua [API thông báo](../../RentalManagement/docs/api.md#notifications). STOMP `/user/queue/notifications` chỉ báo CHANGED để FE tải lại; đồng bộ khi reconnect/focus và mỗi 60 giây. Logout/đổi tài khoản hủy request, xóa badge cũ. Giờ nghiệp vụ thông báo hiển thị theo Việt Nam. Xem [hạ tầng và kiểm thử](../../RentalManagement/docs/OPERATIONS.md#thong-bao).
