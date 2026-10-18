# AI Coding Rules - DOANTOTNGHIEPFE

## Mục lục
1. [Quy tắc Component](#quy-tắc-component)
2. [Quy tắc Styles & Colors](#quy-tắc-styles--colors)
3. [Quy tắc Models & DTOs](#quy-tắc-models--dtos)
4. [Quy tắc Services](#quy-tắc-services)
5. [Quy tắc Shared/Utils](#quy-tắc-sharedutils)
6. [Quy tắc kiến trúc Component](#quy-tắc-kiến-trúc-component)

---

## Quy tắc Component

### ✅ BẮT BUỘC: Tách biệt 3 file cho mỗi Component

**Mỗi component/giao diện PHẢI viết đủ 3 file riêng biệt:**

```
src/app/features/room/components/room-card/
├── room-card.component.html    ← Template HTML
├── room-card.component.scss    ← Styles SCSS
└── room-card.component.ts      ← Logic TypeScript
```

**❌ KHÔNG ĐƯỢC:**
- Gộp HTML vào file `.ts` (sử dụng `template:` hoặc `templateUrl` trỏ đến file khác vẫn OK, miễn là file `.html` riêng)
- Gộp SCSS vào file `.ts` (sử dụng `styles:` hoặc `styleUrls` trỏ đến file khác vẫn OK, miễn là file `.scss` riêng)
- Viết tất cả trong 1 file `.ts` duy nhất

**Lý do:**
- Dễ debug khi UI không hiển thị đúng
- Dễ đọc code khi có người khác review
- Editor hỗ trợ syntax highlighting tốt hơn
- Git diff rõ ràng hơn khi chỉ thay đổi 1 phần (HTML/CSS/TS)

### ✅ Cấu trúc thư mục Component

```
src/app/features/{module}/components/{component-name}/
├── {component-name}.component.html
├── {component-name}.component.scss
├── {component-name}.component.ts
└── {component-name}.component.spec.ts  (nếu có)
```

---

## Quy tắc Styles & Colors

### ✅ BẮT BUỘC: Kiểm tra Design Tokens trước khi viết UI

**TRƯỚC KHI viết bất kỳ giao diện nào, LUÔN kiểm tra file:**

```
src/styles.scss
```

**Sử dụng CSS Variables đã được định nghĩa sẵn:**

#### Primary Colors (Trust - Teal)
```scss
--primary           // Màu chính (#00685f)
--primary-hover     // Hover state
--primary-active    // Active state
--primary-focus     // Focus ring
--primary-subtle    // Background nhạt
--primary-container // Container
```

#### Secondary Colors (Warmth - Amber)
```scss
--secondary         // Màu phụ (#855300)
--secondary-hover   // Hover state
--secondary-subtle  // Background nhạt
```

#### Semantic Colors
```scss
--success           // Thành công (#10b981)
--warning           // Cảnh báo (#f59e0b)
--error             // Lỗi (#ba1a1a)
--info              // Thông tin (#3b82f6)
```

#### Text Colors
```scss
--text-primary      // Text chính (#0f172a)
--text-secondary    // Text phụ (#475569)
--text-placeholder  // Placeholder (#94a3b8)
```

#### Spacing
```scss
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px
--space-2xl: 40px
```

#### Border Radius
```scss
--radius-sm: 6px
--radius: 8px
--radius-md: 12px
--radius-lg: 16px
--radius-full: 9999px  // Pill shape
```

#### Shadows
```scss
--shadow-card    // Card ở trạng thái nghỉ
--shadow-hover   // Card khi hover
--shadow-floating // Floating elements
--shadow-modal   // Modal/Dialog
```

### ✅ Ví dụ sử dụng đúng

```scss
// ✅ ĐÚNG: Sử dụng CSS Variables
.my-component {
  background: var(--surface);
  color: var(--text-primary);
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  
  &:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-3px);
  }
}

.primary-btn {
  background: var(--primary);
  color: #ffffff;
  border-radius: var(--radius-full);
  padding: 12px 24px;
}

// ❌ SAI: Hardcode màu
.my-component {
  background: #ffffff;
  color: #0f172a;
  padding: 16px;
  border-radius: 16px;
}
```

---

## Quy tắc Models & DTOs

### ✅ Cấu trúc thư mục Models

```
src/app/core/models/
├── {entity}/
│   ├── request/
│   │   ├── create-{entity}-request.ts
│   │   ├── update-{entity}-request.ts
│   │   └── {entity}-request.ts
│   ├── response/
│   │   ├── {entity}-response.ts
│   │   ├── {entity}-detail-response.ts
│   │   └── {entity}-list-response.ts
│   └── {entity}.model.ts           ← Model TypeScript
│   └── {entity}.mapper.ts          ← Mapper (DTO → Model)
```

### ✅ Ví dụ: Model Room

```typescript
// src/app/core/models/room/request/create-room-request.ts
export interface CreateRoomRequest {
  title: string;
  price: number;
  area: number;
  address: string;
  description?: string;
  images?: string[];
}
```

```typescript
// src/app/core/models/room/request/update-room-request.ts
export interface UpdateRoomRequest {
  id: number;
  title?: string;
  price?: number;
  area?: number;
  address?: string;
  description?: string;
  images?: string[];
}
```

```typescript
// src/app/core/models/room/response/room-response.ts
export interface RoomResponse {
  id: number;
  title: string;
  price: number;
  area: number;
  address: string;
  description: string;
  images: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  ownerId: number;
  ownerName: string;
  ownerAvatar?: string;
  isVerified: boolean;
  isPromoted: boolean;
  viewCount: number;
  rating: number;
  reviewCount: number;
}
```

```typescript
// src/app/core/models/room/room.model.ts
export interface Room {
  id: number;
  title: string;
  price: number;
  area: number;
  address: string;
  description: string;
  images: string[];
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
  owner: RoomOwner;
  isVerified: boolean;
  isPromoted: boolean;
  viewCount: number;
  rating: number;
  reviewCount: number;
}

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  PENDING = 'PENDING',
  ARCHIVED = 'ARCHIVED'
}

export interface RoomOwner {
  id: number;
  name: string;
  avatar?: string;
  isVerified: boolean;
}
```

```typescript
// src/app/core/models/room/room.mapper.ts
import { RoomResponse } from './response/room-response';
import { Room, RoomOwner, RoomStatus } from './room.model';

export class RoomMapper {
  
  static fromResponse(response: RoomResponse): Room {
    return {
      id: response.id,
      title: response.title,
      price: response.price,
      area: response.area,
      address: response.address,
      description: response.description,
      images: response.images,
      status: this.mapStatus(response.status),
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt),
      owner: this.mapOwner(response),
      isVerified: response.isVerified,
      isPromoted: response.isPromoted,
      viewCount: response.viewCount,
      rating: response.rating,
      reviewCount: response.reviewCount,
    };
  }
  
  static fromResponseList(responses: RoomResponse[]): Room[] {
    return responses.map(r => this.fromResponse(r));
  }
  
  private static mapOwner(response: RoomResponse): RoomOwner {
    return {
      id: response.ownerId,
      name: response.ownerName,
      avatar: response.ownerAvatar,
      isVerified: response.isVerified,
    };
  }
  
  private static mapStatus(status: string): RoomStatus {
    switch (status) {
      case 'AVAILABLE': return RoomStatus.AVAILABLE;
      case 'RENTED': return RoomStatus.RENTED;
      case 'PENDING': return RoomStatus.PENDING;
      case 'ARCHIVED': return RoomStatus.ARCHIVED;
      default: return RoomStatus.AVAILABLE;
    }
  }
}
```

### ✅ Nguyên tắc sử dụng Model

1. **Service nhận DTO từ API** → Map sang Model → Trả về Model cho Component
2. **Component chỉ làm việc với Model**, không làm việc trực tiếp với DTO
3. **Model có thể có computed properties, methods, enums** mà DTO không có

---

## Quy tắc Services

### ✅ Service phải Map DTO sang Model

```typescript
// src/app/core/services/room.service.ts
@Injectable({
  providedIn: 'root'
})
export class RoomService {
  
  constructor(
    private http: HttpClient,
    private roomMapper: RoomMapper
  ) {}
  
  getRooms(params: RoomQueryParams): Observable<RoomListResult> {
    return this.http.get<ApiResponse<RoomListResponse>>(`${this.api}/rooms`, { params })
      .pipe(
        map(response => ({
          items: this.roomMapper.fromResponseList(response.data.items),
          total: response.data.total,
          page: response.data.page,
          pageSize: response.data.pageSize,
        }))
      );
  }
  
  getRoomById(id: number): Observable<Room> {
    return this.http.get<ApiResponse<RoomResponse>>(`${this.api}/rooms/${id}`)
      .pipe(
        map(response => this.roomMapper.fromResponse(response.data))
      );
  }
  
  createRoom(request: CreateRoomRequest): Observable<Room> {
    return this.http.post<ApiResponse<RoomResponse>>(`${this.api}/rooms`, request)
      .pipe(
        map(response => this.roomMapper.fromResponse(response.data))
      );
  }
}
```

### ✅ Nguyên tắc Service

1. **Tên Service** theo pattern: `{Entity}Service` (VD: `RoomService`, `UserService`)
2. **API Endpoint** đặt trong biến private `api`
3. **Luôn import và sử dụng Mapper** để convert DTO → Model
4. **Observable return type** phải là Model, không phải DTO
5. **Error handling** nên dùng `catchError` operator

---

## Quy tắc Shared/Utils

### ✅ BẮT BUỘC: Kiểm tra Shared Utils TRƯỚC KHI Code

**TRƯỚC KHI viết bất kỳ function xử lý chung nào, LUÔN kiểm tra:**

```
src/app/shared/
├── utils/
│   ├── text-utils.ts      ← Xử lý text, format
│   ├── image-utils.ts     ← Xử lý ảnh
│   ├── date-utils.ts      ← Xử lý ngày tháng
│   ├── validation-utils.ts ← Validation helpers
│   └── index.ts           ← Export all
├── components/            ← Shared components
│   ├── loading/
│   ├── error/
│   ├── confirm-dialog/
│   └── ...
```

### ✅ Các Utils hiện có

#### TextUtils (`src/app/shared/utils/text-utils.ts`)
```typescript
class TextUtils {
  // Format số thành tiền VND
  static toVnd(amount: number, currency = 'VNĐ'): string
  
  // Format percentage
  static toPercentage(percentage: number): string
  
  // Format date theo pattern
  static formatDate(date: Date, pattern: string): string
}
```

#### ImageUtils (`src/app/shared/utils/image-utils.ts`)
```typescript
class ImageUtils {
  // Detect MIME type từ base64
  static detectImageMime(base64: string): string
  
  // Convert sang src hợp lệ cho <img>
  static toImageSrc(value: string | null | undefined, fallback?: string): string
}
```

### ✅ Quy tắc thêm Utils mới

1. **Đặt tên file** theo pattern: `{feature}-utils.ts` hoặc `utils-{name}.ts`
2. **Export class hoặc function** với prefix tên feature (VD: `RoomUtils`, `UserValidator`)
3. **Cập nhật index.ts** để export tất cả utils
4. **Viết JSDoc comment** cho mỗi method

### ✅ Ví dụ thêm Utils mới

```typescript
// src/app/shared/utils/room-utils.ts
export class RoomUtils {
  
  /**
   * Tính khoảng cách từ phòng đến trường đại học gần nhất
   * @param roomAddress Địa chỉ phòng
   * @param universities Danh sách trường đại học
   * @returns Khoảng cách dạng text
   */
  static getDistanceToUniversity(
    roomAddress: string, 
    universities: University[]
  ): string {
    // Implementation...
  }
  
  /**
   * Format price display theo chuẩn Việt Nam
   * @param price Giá tiền
   * @returns VD: "3.800.000 đ / tháng"
   */
  static formatPrice(price: number): string {
    const formatted = price.toLocaleString('vi-VN');
    return `${formatted} đ / tháng`;
  }
}
```

---

## Quy tắc kiến trúc Component

### ✅ Chia nhỏ Component

**NGUYÊN TẮC:** Mỗi component nên có **một trách nhiệm duy nhất** (Single Responsibility Principle)

### ✅ Ví dụ: Room Listing Page

```
src/app/features/room/
├── components/
│   ├── room-card/                    ← Card hiển thị 1 phòng
│   │   ├── room-card.component.html
│   │   ├── room-card.component.scss
│   │   └── room-card.component.ts
│   │
│   ├── room-card-skeleton/           ← Skeleton loading cho card
│   │   ├── room-card-skeleton.component.html
│   │   ├── room-card-skeleton.component.scss
│   │   └── room-card-skeleton.component.ts
│   │
│   ├── room-filter/                  ← Bộ lọc tìm kiếm
│   │   ├── room-filter.component.html
│   │   ├── room-filter.component.scss
│   │   └── room-filter.component.ts
│   │
│   ├── room-list/                    ← Danh sách phòng
│   │   ├── room-list.component.html
│   │   ├── room-list.component.scss
│   │   └── room-list.component.ts
│   │
│   ├── room-search-bar/              ← Thanh tìm kiếm
│   │   ├── room-search-bar.component.html
│   │   ├── room-search-bar.component.scss
│   │   └── room-search-bar.component.ts
│   │
│   └── filter-pill/                  ← Pill tag cho filter
│       ├── filter-pill.component.html
│       ├── filter-pill.component.scss
│       └── filter-pill.component.ts
│
├── pages/
│   └── room-list-page/               ← Page chính
│       ├── room-list-page.component.html
│       ├── room-list-page.component.scss
│       └── room-list-page.component.ts
│
└── models/
    ├── room.model.ts
    ├── room.mapper.ts
    └── ...
```

### ✅ Component Input/Output

```typescript
// room-card.component.ts
@Component({
  selector: 'app-room-card',
  templateUrl: './room-card.component.html',
  styleUrls: ['./room-card.component.scss']
})
export class RoomCardComponent {
  // Input: nhận data từ parent
  @Input() room!: Room;
  @Input() showActions = true;
  
  // Output: bắn event lên parent
  @Output() viewDetails = new EventEmitter<number>();
  @Output() wishlistToggle = new EventEmitter<Room>();
  
  // Utility inject nếu cần
  imageUtils = ImageUtils;
  textUtils = TextUtils;
  
  onViewClick(): void {
    this.viewDetails.emit(this.room.id);
  }
  
  onWishlistClick(): void {
    this.wishlistToggle.emit(this.room);
  }
}
```

### ✅ OnPush Change Detection

```typescript
@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoomCardComponent {
  // Khi dùng OnPush, cần markForCheck khi có async data
  private cdr = inject(ChangeDetectorRef);
  
  updateData(newData: Room): void {
    this.room = newData;
    this.cdr.markForCheck();
  }
}
```

---

## Tổng kết Checklist

### Trước khi code component mới:
- [ ] Kiểm tra `src/styles.scss` xem có CSS variables cần dùng không
- [ ] Kiểm tra `src/app/shared/utils/` xem có utils chưa
- [ ] Tạo đủ 3 file: `.html`, `.scss`, `.ts`
- [ ] Đặt tên theo pattern: `{name}.component.{html|scss|ts}`

### Trước khi code model:
- [ ] Tạo folder structure: `request/`, `response/`, `model.ts`, `mapper.ts`
- [ ] Viết Request DTOs cho API calls
- [ ] Viết Response DTOs cho API responses
- [ ] Viết Model TypeScript với types, enums
- [ ] Viết Mapper để convert DTO → Model

### Trước khi code service:
- [ ] Import và sử dụng Mapper
- [ ] Trả về Observable<Model>, không phải Observable<DTO>
- [ ] Sử dụng CSS variables cho styled elements (nếu có)

### Khi viết styles:
- [ ] Sử dụng CSS variables từ `styles.scss`, không hardcode colors
- [ ] Sử dụng spacing variables thay vì số cố định
- [ ] Sử dụng radius variables thay vì hardcode

---

## Font chính
**Be Vietnam Pro** - Font được sử dụng cho toàn bộ ứng dụng
