# Management table

Standalone `app-management-table` dùng chung cho landlord và admin, không phụ thuộc API hay model nghiệp vụ.

- Truyền `rows`, `columns`, `rowKey` (hàm trả ID duy nhất) và `caption` mô tả bảng.
- Cột đơn giản dùng `value: (row) => ...`; giá trị null/undefined hiển thị `—`.
- Cột tùy chỉnh dùng `<ng-template [appTableCell]="rows" column="key" let-row let-index="index">...</ng-template>`. Import `ManagementTableCellDirective` ở màn sử dụng. Binding `appTableCell` giúp Angular kiểm tra kiểu của `row`.
- `loading`, `error`, `emptyMessage`, `emptyDescription` điều khiển trạng thái. Sự kiện `retry` giao việc tải lại cho màn gọi. Nội dung có thuộc tính `tableEmpty` hiển thị trong trạng thái rỗng.
- Phân trang tùy chọn: `pagination = { page, total, totalPages }`, với `page` bắt đầu từ 0. Xử lý `(pageChange)` để tải trang mới; component không tự cắt mảng hoặc gọi API.
- Bộ chọn số dòng có các giá trị 5, 10, 20, mặc định `pageSize = 10`. Xử lý `(pageSizeChange)` để cập nhật kích thước trang và tải/trở về trang 0. Bộ chọn vẫn hiển thị khi có một trang hoặc danh sách rỗng.
- Đặt tiêu đề, nút thêm và bộ lọc trong một phần tử có thuộc tính `tableToolbar` để hiển thị cùng khối với bảng và phân trang.
- Dùng `disabled` để khóa phân trang và bộ chọn số dòng khi đang xử lý thao tác trên một bản ghi, vẫn giữ bảng hiển thị.
- Tìm kiếm, lọc, sắp xếp và quyền thao tác do màn gọi quản lý. Bảng cuộn ngang trên màn hình nhỏ, dùng HTML table, caption và tiêu đề cột có scope.

Tham khảo cách dùng thực tế trong `property-management-page.component`, `property-rooms.component`, `listing-page.component`, `payment-history-page.component` và nhánh landlord của `rental-list-page.component`.
