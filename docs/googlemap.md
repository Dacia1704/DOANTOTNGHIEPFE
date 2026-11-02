# Google Maps trong frontend

Triển khai dựa trên [hợp đồng vị trí](GOOGLE_MAPS_INTEGRATION.md) và [API](api.md). Vị trí thuộc cơ sở cho thuê; phòng và tin đăng dùng chung vị trí đó.

## Cấu hình để chạy bản đồ

1. Trong Google Cloud, bật **Maps JavaScript API** và **Places API (New)** cho dự án Maps của bạn.
2. Tạo API key dành cho trình duyệt, giới hạn website được dùng (localhost khi phát triển và tên miền triển khai) và giới hạn hai API ở trên.
3. Điền cấu hình trong `src/environments/google-maps.config.ts`:

```typescript
export const googleMapsConfig = {
  apiKey: 'YOUR_BROWSER_API_KEY',
  mapId: 'DEMO_MAP_ID',
};
```

`DEMO_MAP_ID` dùng khi phát triển. Khi triển khai, thay bằng JavaScript map ID của dự án. Cấu hình được dùng chung cho development, production và Docker; khởi động lại/build lại frontend sau khi đổi cấu hình. Không dùng server key hoặc đưa khóa bí mật của backend vào file này.

SDK chỉ tải khi mở chức năng bản đồ, dùng một lượt tải chung và gọi `importLibrary` cho Maps, Advanced Markers hoặc Places khi cần. Key chưa cấu hình, lỗi mạng hoặc xác thực không làm mất địa chỉ và các thao tác nhập/lưu thông thường. Nút mở Google Maps và chỉ đường dùng Maps URL, không cần API key.

## Các điểm sử dụng

- **Tạo cơ sở:** tìm địa điểm bằng Google Places, chọn/kéo ghim, dùng vị trí hiện tại hoặc nhập tọa độ thủ công. Tỉnh/phường vẫn chọn theo danh mục backend; gợi ý Google không tự chuyển thành ID nội bộ.
- **Cơ sở của tôi → chọn cơ sở → Sửa địa chỉ & vị trí:** gửi toàn bộ địa chỉ và cặp tọa độ tới `PUT /api/properties/{id}/location`. Xóa ghim gửi cả hai tọa độ null. Không gửi lại thông tin phòng, giá hoặc tiện ích.
- **Đổi địa chỉ:** xóa ghim cũ và yêu cầu chọn lại nếu muốn lưu tọa độ; không giữ một ghim đã chọn cho địa chỉ khác.
- **Chọn gợi ý Google:** điền số nhà/tên đường vào địa chỉ cụ thể và áp dụng ghim mới cùng lần chọn. Không tự đổi tỉnh/phường bằng tên Google; người dùng kiểm tra lại hai lựa chọn trong danh mục nội bộ.
- **Chi tiết tin:** hiển thị ghim, địa chỉ và chỉ đường. Cơ sở cũ thiếu tọa độ chỉ hiển thị địa chỉ; tọa độ 0 vẫn hợp lệ.
- **Admin → Quản lý bài đăng:** có địa chỉ và phần mở bản đồ để đối chiếu khi duyệt tin. Không có thao tác sửa vị trí của chủ trọ.
- **Trang tìm phòng → Bản đồ:** tìm trong khung đang xem, theo bán kính quanh địa điểm/vị trí hiện tại, hoặc tắt lọc vị trí. Bộ lọc giá, khu vực, tiện ích và loại phòng vẫn được giữ.

## Quy tắc tìm kiếm

- Khung bản đồ gửi đủ `south`, `north`, `west`, `east`; giữ khả năng đi qua kinh tuyến 180°.
- Bán kính gửi đủ `latitude`, `longitude`, `radiusKm`, tính bằng km theo đường chim bay.
- Khi đổi chế độ, bỏ toàn bộ tham số của chế độ trước. Khi bỏ lọc bản đồ, không xóa bộ lọc giá/tiện ích/khu vực.
- Chuyển vùng hoặc đổi bộ lọc về trang đầu. Kéo bản đồ chờ 450 ms trước khi tìm; yêu cầu cũ bị hủy khi có yêu cầu mới.
- Tổng số tin và thứ tự ưu tiên do backend trả về. Ghim chỉ biểu diễn tin của trang hiện tại, không đại diện toàn bộ kết quả.
- Chỉ xin quyền định vị khi người dùng bấm nút; từ chối quyền vẫn có thể chọn địa điểm/ghim thủ công.

## Kiểm tra

Các kiểm thử liên quan nằm ở `maps-api.spec.ts`, `maps-components.spec.ts`, form tạo/sửa cơ sở và trang tìm phòng. Chạy `npm test -- --watch=false` để chạy các kiểm thử của frontend.

Kiểm thử tự động sử dụng SDK giả lập, không gọi Google API có phí. Để nghiệm thu trực tiếp, cấu hình key, mở Bản đồ và kiểm tra gợi ý địa điểm, kéo ghim, tạo/sửa/xóa ghim, tìm bán kính, kéo nhanh bản đồ, phân trang, từ chối định vị và admin xem vị trí.

## Tài liệu Google

- [Tải Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [Place Autocomplete mới](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
- [Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/draggable-markers)
- [Maps URLs](https://developers.google.com/maps/documentation/urls/guide)
