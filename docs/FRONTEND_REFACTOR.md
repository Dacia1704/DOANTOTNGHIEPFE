# Tổ chức frontend sau refactor

## Features và layout

`features` chỉ có bốn nhóm cấp đầu:

| Nhóm | Trách nhiệm | Layout |
| --- | --- | --- |
| `admin` | Danh mục, người dùng, duyệt tin và vận hành thanh toán | `AdminLayout` |
| `auth` | Đăng nhập, đăng ký, quên mật khẩu, xác minh email | `TenantLayoutComponent` |
| `tenant` | Landing, tìm trọ, xem chi tiết tin và đặt phòng | `TenantLayoutComponent` |
| `landlord` | Cơ sở cho thuê, phòng, tin đăng, gói dịch vụ, Boost, thanh toán | `LandlordLayout` |

Mỗi nhóm có file `*.routes.ts` riêng và được lazy-load từ `app.routes.ts`.
`shared/pages` chứa các màn nhiều vai trò cùng dùng: hồ sơ, chat, yêu cầu thuê và hợp đồng.
`shared/components` chứa cả chat widget, danh sách phòng của cơ sở và dialog xem phòng vì chúng xuất hiện ở nhiều nhóm.

`AdminLayout` và `LandlordLayout` khai báo menu riêng, cùng sử dụng `DashboardLayoutComponent` cho header, sidebar, breadcrumb, thu gọn menu và drawer mobile.
Không tạo số liệu dashboard giả: trang vào của landlord tiếp tục là màn quản lý cơ sở/phòng hiện có.

## URL và phân quyền

- Giữ nguyên `/phong-cua-toi`, `/tin-cua-toi`, `/quan-ly-dat-phong`, `/goi-dich-vu`, `/boost`, `/lich-su-thanh-toan` và `/thanh-toan/...`; chúng dùng landlord layout.
- `/landlord` chuyển về `/phong-cua-toi`; `/dang-tin` chuyển về `/tin-cua-toi` như trước.
- Landlord có `/landlord/profile`, `/landlord/messages`, `/landlord/agreements/:id`.
- Các URL chung cũ `/trang-ca-nhan`, `/cai-dat`, `/tin-nhan`, `/hop-dong/:id` chọn màn dashboard tương ứng khi session là landlord; tenant vẫn dùng layout public.
- Nhóm landlord dùng parent path rỗng để giữ URL cũ. Đặt nhóm này trước public routes để router chọn đúng layout. `canMatch` của các alias cho phép tenant tiếp tục khớp public routes.
- `canActivate` và `canActivateChild` kiểm tra quyền admin/landlord khi vào layout và khi chuyển giữa các màn con.
- URL callback thanh toán và query parameters được giữ để tương thích các tích hợp hiện có.

## Services theo nghiệp vụ

| Thư mục trong `core/services` | Services |
| --- | --- |
| `auth` | AuthService |
| `identity` | UserService |
| `address` | AddressService, AdministrativeUnitService |
| `property` | PropertyService, PropertyTypeService |
| `room` | RoomService, RoomTypeService, AmenityService |
| `listing` | ListingService, PublicListingService |
| `rental` | RentalService |
| `subscription` | ServicePackageService, SubscriptionService, BoostService |
| `payment` | PaymentService |
| `chat` | ChatService, ChatWidgetService |
| `ai` | AiService |
| `maps` | GoogleMapsService, GeolocationService |
| `common` | BillingApiService: transport/mapping đang dùng chung giữa listing, subscription và payment |

Các nhóm nghiệp vụ bám theo package backend `RentalManagement`; `ai` và `maps` là tích hợp riêng của FE.
Đây là nhóm theo thư mục, không thêm Angular NgModule. Các services giữ `providedIn: 'root'` để không tạo nhiều instance của session/chat khi lazy-load.
Import ví dụ: `@services/property/property.service`, `@services/auth/auth.service`.
Spec của service được chuyển cùng nhóm; các kiểm tra tích hợp nhiều service nằm ở `payment/billing-api.spec.ts` và `maps/maps-api.spec.ts`.

## Đề xuất refactor tiếp

1. **Tách UI điều phối theo vai trò khỏi UI dùng chung.** Admin hiện tái sử dụng listing page và payment result của landlord. Có thể tạo các page wrapper theo vai trò và chuyển phần hiển thị dùng chung vào shared, thay cho mở rộng các nhánh `admin` trong cùng page.
2. **Tách model billing theo domain.** `core/models/billing` đang gom cả listing, gói dịch vụ, subscription, Boost, thanh toán và hóa đơn. Nên tách theo module tương ứng với services; thực hiện cùng một đợt rà soát mapper và DTO để tránh đổi payload API ngoài ý muốn.
3. **Tách các màn lớn theo phần giao diện và trạng thái.** Ưu tiên chat, chi tiết tin đăng và form cơ sở cho thuê. Page điều phối dữ liệu; component con nhận input/output. Những luồng có polling, retry và hủy request phức tạp nên có facade riêng nếu được nhiều component sử dụng.
4. **Rà soát các màn cũ và dữ liệu mẫu.** `landlord/room/pages/room-management-page` hiện chưa được route trỏ tới, trong khi quản lý phòng đã nằm trong quản lý cơ sở. `tenant/landing/data/landing.mock.ts` còn cung cấp kiểu dữ liệu và hằng số cho UI; nên tách kiểu/hằng số thật khỏi mock trước khi loại bỏ phần không dùng.

## Kiểm tra

- `npm run build`: kiểm tra production bundle, template và SCSS sau khi di chuyển file.
- `npm test -- --watch=false`: toàn bộ spec hiện có và các kiểm tra navigation/layout mới.
- Test route thay page bằng component đơn giản để kiểm tra route table, layout selection và guard mà không gọi backend; không thay thế kiểm tra giao diện bằng trình duyệt.
