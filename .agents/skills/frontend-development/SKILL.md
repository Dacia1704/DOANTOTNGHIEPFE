---
name: frontend-development
description: >-
  Comprehensive guide and runbook for developing, building, styling, and testing
  the Angular 22 frontend (DOANTOTNGHIEPFE) of the Rental Management system.
  Activate when working on UI components, state, routing, API integration, MapLibre/MapTiler,
  WebSocket chat/notifications, or Angular build/deploy procedures.
---

# Frontend Development Guide (DOANTOTNGHIEPFE)

Tài liệu hướng dẫn và quy chuẩn kỹ thuật cho việc phát triển, kiểm thử và vận hành ứng dụng Frontend của Hệ thống Quản lý Thuê trọ (Rental Management).

---

## 1. Tổng quan Công nghệ & Môi trường

| Thành phần | Công nghệ / Phiên bản | Ghi chú |
| :--- | :--- | :--- |
| **Framework** | Angular 22.2.0 | Standalone Components, Signal-based reactivity, OnPush |
| **Language** | TypeScript ~6.0.2 | Strict mode enabled |
| **UI Library** | Angular Material / CDK 22.2.1 | Cung cấp component nền tảng & accessible primitives |
| **Styling** | SCSS + CSS Custom Properties | Hệ thống Design tokens đặt tại `src/styles.scss` |
| **Font** | Be Vietnam Pro | Font mặc định cho toàn bộ ứng dụng |
| **Map Engine** | MapLibre GL 6.16.0 + MapTiler | Bản đồ số, định vị tọa độ cơ sở, geocoding |
| **Realtime** | `@stomp/stompjs` 7.3.0 + `sockjs-client` | WebSocket STOMP cho Chat và Thông báo chuông |
| **PDF Viewer** | `pdfjs-dist` 6.4.299 | Xem hợp đồng thuê PDF trực tuyến |
| **Runtime Node** | **Node.js 26.0.0** | Không dùng Node 20 (bị lỗi không tương thích Angular 22) |
| **Package Manager**| `npm` (dùng `npm ci` theo `package-lock.json`) | Giữ toàn vẹn phiên bản thư viện |

### Cổng & Đường dẫn Mạng Local

*   **Frontend Dev Server**: `http://localhost:4200`
*   **Frontend Docker Nginx**: `http://localhost:80`
*   **Reverse Proxy (`proxy.conf.json`)**:
    *   `/api` $\rightarrow$ `http://localhost:8080/api` (Spring Boot REST)
    *   `/ws` $\rightarrow$ `http://localhost:8080/ws` (Spring Boot WebSocket STOMP)
    *   `/ai` $\rightarrow$ `http://localhost:8000/ai` (FastAPI AI Service & SSE Chat stream)

---

## 2. Cấu trúc Thư mục Dự án

```text
DOANTOTNGHIEPFE/
├── src/
│   ├── app/
│   │   ├── core/                    # Hạ tầng ứng dụng
│   │   │   ├── guards/              # Route guards (AuthGuard, RoleGuard)
│   │   │   ├── interceptors/        # HTTP interceptors (JWT Token, Error handling)
│   │   │   ├── models/              # DTOs request/response, Domain models, Mappers
│   │   │   │   └── {entity}/
│   │   │   │       ├── request/     # DTO gửi lên backend
│   │   │   │       ├── response/    # DTO nhận từ backend
│   │   │   │       ├── {entity}.model.ts
│   │   │   │       └── {entity}.mapper.ts
│   │   │   └── services/            # Core singleton services (Auth, Storage, Theme)
│   │   ├── features/                # 4 phân hệ chính theo Role & Nghiệp vụ
│   │   │   ├── admin/               # Quản trị hệ thống, duyệt tin, xử lý vi phạm
│   │   │   ├── auth/                # Đăng nhập, đăng ký, quên mật khẩu
│   │   │   ├── landlord/            # Quản lý cơ sở, phòng, tin đăng, hợp đồng, gói
│   │   │   └── tenant/              # Tìm kiếm phòng, gửi yêu cầu thuê, chat, cộng đồng
│   │   ├── layouts/                 # Shell layouts (AdminLayout, MainLayout, AuthLayout)
│   │   ├── shared/                  # Tái sử dụng giữa nhiều tính năng
│   │   │   ├── components/          # Management Table, Dialog, Pager, Room Card...
│   │   │   ├── directives/          # FeedImpressionDirective...
│   │   │   ├── pages/               # Trang 404, error, unauthorized...
│   │   │   └── utils/               # TextUtils, ImageUtils, DateUtils...
│   │   ├── app.config.ts            # Cấu hình providers (router, http, animations)
│   │   ├── app.routes.ts            # Khai báo định tuyến chính
│   │   └── app.ts / app.html        # Root component
│   ├── environments/                # Cấu hình môi trường & MapTiler
│   │   ├── environment.ts           # Mặc định (production)
│   │   ├── environment.development.ts # Development local
│   │   ├── environment.docker.ts    # Docker build configuration
│   │   └── maptiler.config.ts       # MapTiler API Key & style URL
│   └── styles.scss                  # Design system tokens, variables, utility classes
├── proxy.conf.json                  # Cấu hình dev proxy chuyển hướng API/WS/AI
├── angular.json                     # Cấu hình Angular CLI workspace & file replacements
└── package.json                     # Danh sách dependencies & scripts
```

> [!IMPORTANT]
> Không xóa các file trong `src/environments/` dù không có câu lệnh `import` trực tiếp. Chúng được Angular build tráo đổi tự động thông qua cấu hình `fileReplacements` trong `angular.json`.

---

## 3. Quy chuẩn Thiết kế & UI/UX

Tất cả các thành phần giao diện phải tuân thủ nghiêm ngặt theo Design System tại `src/styles.scss`:

1.  **CSS Variables cho Màu sắc**:
    *   Màu chủ đạo (Teal): `--primary`, `--primary-hover`, `--primary-focus`, `--primary-subtle`, `--primary-container`.
    *   Màu phụ (Amber): `--secondary`, `--secondary-hover`, `--secondary-container`.
    *   Màu ngữ nghĩa: `--color-success`, `--color-warning`, `--color-error`, `--color-info`.
    *   Màu chữ & nền: `--text-primary`, `--text-secondary`, `--text-placeholder`, `--bg-body`, `--bg-surface`.
    *   *Tuyệt đối không hardcode mã hex màu rời rạc trong component SCSS.*
2.  **Khoảng cách, Bo góc & Đổ bóng**:
    *   Khoảng cách: `--space-xs` (4px), `--space-sm` (8px), `--space-md` (16px), `--space-lg` (24px), `--space-xl` (32px).
    *   Bo góc: `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-full` (9999px).
    *   Đổ bóng: `--shadow-card`, `--shadow-hover`, `--shadow-floating`, `--shadow-modal`.
3.  **Trạng thái & Khả năng tiếp cận (Accessibility)**:
    *   Badge trạng thái không được chỉ dựa vào màu sắc; luôn đi kèm nhãn text rõ ràng và icon hỗ trợ.
    *   Hỗ trợ tương tác bàn phím (focus states) và tương thích giao diện điện thoại (responsive).
    *   Tái sử dụng các trạng thái chuẩn: `loading-spinner`, `error-alert`, `empty-state`.

---

## 4. Quy tắc Code Frontend & Mô hình DTO/Model

Tuân thủ triệt để [RULE.md](file:///e:/SpringBoot/DoAn/DOANTOTNGHIEPFE/docs/RULE.md):

### 4.1. Cấu trúc Component
*   Mỗi component bắt buộc tách thành **3 file riêng biệt**: `{name}.component.ts`, `{name}.component.html`, `{name}.component.scss`. Không nhúng inline template hoặc inline style.
*   Thiết lập: `standalone: true`, `changeDetection: ChangeDetectionStrategy.OnPush`.
*   Sử dụng **Angular Signals** (`signal()`, `computed()`) cho reactive state trong component.
*   Dùng `@Input()` (hoặc `input()`) nhận dữ liệu và `@Output()` (hoặc `output()`) bắn sự kiện ra ngoài.
*   Tách biệt rõ ràng: **Page Component** (điều phối luồng, gọi service, bắt router params) và **Presentational Component** (chỉ hiển thị, nhận inputs và phát outputs).

### 4.2. DTO, Service & Mapper Flow
*   **DTO (Data Transfer Object)**:
    *   Đặt tại `src/app/core/models/{entity}/request/` và `src/app/core/models/{entity}/response/`.
    *   Mô tả chính xác JSON contract trả về từ Backend.
*   **Domain Model & Mapper**:
    *   Đặt tại `src/app/core/models/{entity}/{entity}.model.ts` và `{entity}.mapper.ts`.
    *   Mọi chuyển đổi kiểu dữ liệu (format tiền tệ, ép kiểu Enum, định dạng ngày tháng `date-fns`, parse tọa độ) phải xử lý tập trung trong **Mapper**.
    *   Component chỉ làm việc với **Model**, không được để component tự phân tích cấu trúc thô của API response.
*   **Service**:
    *   Đặt tên `{Entity}Service`. Endpoint lưu trong biến private và xây dựng từ `environment.apiUrl`.
    *   *Không nhân đôi tiền tố `/api`* (nếu `environment.apiUrl` đã có `/api`, chỉ nối tiếp `/${endpoint}`).
    *   Hàm trong Service trả về `Observable<Model>` (sau khi qua `map(res => mapper.toModel(res))`).
    *   Bắt lỗi có ngữ cảnh bằng `catchError`. Không tự ý retry các request mutation (POST/PUT/DELETE).
    *   Khi người dùng submit biểu mẫu: lập tức khóa nút bấm (disable) để chống click đúp, giữ nguyên bản nháp trong form khi backend trả về lỗi để người dùng không mất công nhập lại.
    *   Khi người dùng thay đổi bộ lọc tìm kiếm: tự động reset `page = 0` và hủy request đang chạy dở (`switchMap`).

### 4.3. Tiện ích & Component dùng chung
*   Kiểm tra `src/app/shared/utils/` trước khi viết helper mới. Tái sử dụng:
    *   `TextUtils`: Format tiền tệ VND (`formatVND`), phần trăm, cắt gọn văn bản.
    *   `ImageUtils`: Xử lý src ảnh, fallback avatar, MIME base64.
*   Tái sử dụng `ManagementTableComponent` (`src/app/shared/components/management-table/`) cho các màn hình danh sách quản trị viên và chủ trọ.
*   Ghi nhận lượt xem tin (Impression Tracking): Sử dụng `FeedImpressionDirective` (`[appFeedImpression]`) trên các card phòng trọ và bài viết cộng đồng để tự động ghi nhận khi phần tử xuất hiện $\ge 50\%$ màn hình trong ít nhất 1 giây.

---

## 5. Bản đồ, Realtime & Hợp đồng PDF

1.  **MapLibre GL & MapTiler**:
    *   Key MapTiler nằm tại `src/environments/maptiler.config.ts`.
    *   Tọa độ thuộc về cấp **Cơ sở (`Property`)** gồm `latitude` và `longitude`, dùng chung cho tất cả các phòng và tin đăng thuộc cơ sở đó.
    *   Định vị GPS trình duyệt yêu cầu môi trường `localhost` hoặc `HTTPS`. Luôn cung cấp fallback cho phép người dùng click trực tiếp trên bản đồ để ghim vị trí hoặc nhập địa chỉ.
2.  **WebSocket Chat & Thông báo**:
    *   Kết nối qua STOMP client tới `/ws`.
    *   Đăng ký nhận tin nhắn mới theo kênh cá nhân của user và cập nhật badge chuông thông báo realtime.
3.  **Hợp đồng PDF**:
    *   Sử dụng thư viện `pdfjs-dist` để render preview PDF hợp đồng thuê được sinh từ backend.

---

## 6. Runbooks & Lệnh Vận hành Thường dùng

Tất cả các lệnh thực thi từ thư mục `E:\SpringBoot\DoAn\DOANTOTNGHIEPFE`:

### 6.1. Cài đặt dependencies
```powershell
Set-Location E:\SpringBoot\DoAn\DOANTOTNGHIEPFE
npm ci
```
*(Chỉ dùng `npm install` khi chủ động thêm/bớt package mới; luôn dùng `npm ci` để tôn trọng `package-lock.json`).*

### 6.2. Chạy môi trường Development
```powershell
Set-Location E:\SpringBoot\DoAn\DOANTOTNGHIEPFE
npm start
```
*Truy cập tại `http://localhost:4200`. Các request `/api`, `/ws`, `/ai` sẽ tự động chuyển hướng qua proxy.*

### 6.3. Biên dịch & Kiểm tra Build
```powershell
Set-Location E:\SpringBoot\DoAn\DOANTOTNGHIEPFE
# Build kiểm tra lỗi TypeScript và đóng gói tĩnh
npm run build

# Build cấu hình cho Docker Nginx
npm run build -- --configuration production-docker
```
*Kết quả build nằm tại thư mục `dist/library-frontend/browser`.*

### 6.4. Chạy Frontend bằng Docker Compose
```powershell
Set-Location E:\SpringBoot\DoAn\DOANTOTNGHIEPFE
docker compose up -d --build
docker compose ps
```
*Truy cập tại `http://localhost:80`.*

---

## 7. Các lỗi thường gặp & Cách xử lý

1.  **Lỗi Node.js không tương thích (`Node version not supported`)**:
    *   Kiểm tra `node --version`. Angular 22 yêu cầu Node.js tương thích chính thức (đã kiểm tra chuẩn trên Node.js 26.0.0). Không dùng Node.js 20.
2.  **Lỗi 502 Bad Gateway hoặc SSE ngắt kết nối với AI Chat**:
    *   Kiểm tra backend Spring Boot (:8080) và AIService (:8000) đã bật chưa.
    *   Kiểm tra `proxy.conf.json` có đúng cổng localhost không.
3.  **Lỗi bản đồ không tải được tiles**:
    *   Kiểm tra key trong `src/environments/maptiler.config.ts`.
    *   Đảm bảo domain `localhost:4200` đã được cấp phép trong cấu hình Allowed Origins của MapTiler Cloud.
