# Bản đồ MapTiler + MapLibre GL JS

Frontend dùng `maplibre-gl` để hiển thị bản đồ vector 2D, MapTiler Cloud để tải style/tiles và tìm địa điểm. Không tải Google Maps SDK hoặc gọi Google Places. Nút chỉ đường mở OpenStreetMap.

## Cấu hình

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

## Các điểm sử dụng

- Chi tiết tin và admin: hiển thị vị trí cơ sở, marker, popup và liên kết chỉ đường. Cơ sở thiếu tọa độ giữ địa chỉ, không tự suy đoán ghim.
- Tạo/sửa cơ sở: tìm địa điểm, chọn hoặc kéo ghim, dùng vị trí hiện tại, nhập tọa độ thủ công hoặc xóa ghim. Gợi ý đường/địa chỉ có thể điền địa chỉ cụ thể; tỉnh/phường luôn dùng ID danh mục backend.
- Tìm phòng: giữ bộ lọc khung bản đồ, bán kính quanh địa điểm hoặc vị trí hiện tại. Vòng bán kính được dựng theo khoảng cách trên mặt đất, đơn vị km.
- Tìm địa điểm giới hạn Việt Nam, ưu tiên tiếng Việt; chờ 350 ms sau khi gõ và hủy yêu cầu cũ khi đổi nội dung/ngữ cảnh hoặc đóng component.

SDK được tải bằng dynamic import khi mở bản đồ. MapLibre v6 dùng module worker riêng; `angular.json` sao chép worker và shared module vào `assets/maplibre`, service cấu hình URL theo base URL của ứng dụng. Map, marker, popup và observer được giải phóng khi đóng. Thiếu key, lỗi mạng, lỗi tải style và timeout có thông báo cùng nút thử lại. Địa chỉ và nhập tọa độ thủ công vẫn sử dụng được.

## Hợp đồng dữ liệu

- Tọa độ thuộc Property, các tin/phòng cùng cơ sở dùng chung vị trí. Số 0 hợp lệ; thiếu tọa độ không tự thay bằng một vị trí giả.
- Khung bản đồ gửi `south`, `north`, `west`, `east`, hỗ trợ qua kinh tuyến 180°. Bán kính gửi `latitude`, `longitude`, `radiusKm`.
- Đổi chế độ loại bỏ tham số của chế độ trước, giữ bộ lọc giá/tiện ích/khu vực. Kéo bản đồ chờ 450 ms trước khi tìm.
- Tổng số tin, phân trang và thứ tự do backend trả về. Ghim thể hiện trang hiện tại.
- Chỉ xin quyền định vị khi bấm nút; từ chối quyền vẫn chọn ghim thủ công được.

## Kiểm tra

Chạy `npm test -- --watch=false` và `npm run build`. Kiểm thử bản đồ dùng SDK/fetch giả lập, không gọi dịch vụ MapTiler thật. Kiểm tra trực tiếp với key: chi tiết tin trên desktop/mobile, popup, tìm địa điểm, kéo ghim, bán kính, lỗi mạng và thử tải lại.

Tài liệu: [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/), [MapTiler Geocoding](https://docs.maptiler.com/cloud/api/geocoding/).
