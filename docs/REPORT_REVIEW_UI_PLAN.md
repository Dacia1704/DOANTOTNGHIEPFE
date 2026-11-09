# Kế hoạch giao diện Report và Review

Ngày đối chiếu source: 03/11/2026. Đây là kế hoạch triển khai, chưa thay đổi mã ứng dụng.

## 1. Phạm vi và cơ sở

- Review là đánh giá phòng, chủ trọ và người thuê, gắn với hợp đồng thuê.
- Report là phản ánh vi phạm của tin đăng hoặc chủ trọ; không phải báo cáo thống kê, không hỗ trợ báo cáo review.
- Nguồn nghiệp vụ: `ReviewController`, `ReviewServiceImpl`, `ReportController`, `ReportServiceImpl`, `ReportEvidenceService`, `ImageValidator` và các DTO tương ứng trong BE.
- FE hiện có Angular standalone, signals, OnPush, Angular Material, layout theo vai trò, trang hợp đồng dùng chung và `ManagementTableComponent`. Chưa có module/service/giao diện chuyên biệt cho hai nghiệp vụ này.
- Theo cấu trúc hiện tại trong `docs/FRONTEND_REFACTOR.md`: giữ bốn nhóm feature `admin`, `auth`, `tenant`, `landlord`; các trang/component nhiều vai trò dùng chung đặt trong `shared`.

## 2. Quy tắc nghiệp vụ phải thể hiện trên giao diện

### Review

- Tenant tạo đánh giá `ROOM` và `LANDLORD`; landlord tạo đánh giá `TENANT`.
- Mỗi hợp đồng chỉ có một đánh giá cho mỗi loại. Hai đánh giá của tenant được gửi độc lập; thành công một phần phải được giữ lại.
- Hợp đồng phải có trạng thái `ACTIVE`, `EXPIRED` hoặc `TERMINATED`, hai bên đã xác nhận, ngày bắt đầu không nằm trong tương lai. Không tự đánh giá mình.
- Luôn lấy quyền tạo từ `GET /api/rental-agreements/{id}/review-eligibility`: từng loại trả `canCreate`, `reviewId`, `reason`. Không chỉ suy ra từ status ở FE.
- Điểm là số nguyên 1–5; nhận xét không bắt buộc, tối đa 2.000 ký tự. Payload tạo chỉ gồm `rentalAgreementId`, `rating`, `comment`; BE suy ra đối tượng từ hợp đồng.
- Chưa có API sửa/xóa đánh giá của tác giả. Đánh giá bị ẩn vẫn tồn tại và không cho gửi lại.
- Landlord có thể gửi hoặc cập nhật phản hồi tối đa 2.000 ký tự cho review phòng/chủ trọ thuộc hợp đồng của mình. Review bị ẩn không được phản hồi. Không có phản hồi cho review người thuê.
- Review phòng và chủ trọ được xem công khai theo các điều kiện của BE. Review người thuê chỉ cho chính người thuê, admin, hoặc landlord có quan hệ hợp đồng đã xác nhận với người thuê đó.
- API công khai loại bỏ review bị ẩn, không trả ID tác giả, hợp đồng hay thông tin kiểm duyệt. Không dùng tên/avatar để suy ra quyền.
- Review của listing không chọn phòng được BE tổng hợp theo toàn bộ cơ sở; chọn phòng dùng API riêng theo `roomId`. Không cộng hai tập này với nhau.
- Summary không có review trả `averageRating = null`: hiển thị “Chưa có đánh giá”, không trình bày thành điểm 0/5.

### Report

- Chỉ tenant được tạo, xem danh sách báo cáo của mình và bổ sung minh chứng. Admin xem và xử lý; landlord không có quyền xem hồ sơ báo cáo hoặc ảnh minh chứng.
- Đối tượng gồm `LISTING`, `LANDLORD`. Báo cáo tin đăng yêu cầu tin còn công khai hợp lệ; báo cáo chủ trọ yêu cầu quan hệ hợp đồng đã xác nhận trong các trạng thái được BE chấp nhận. Điều kiện này không kiểm tra ngày bắt đầu như review.
- Một tenant không được tạo báo cáo mới cho cùng đối tượng khi đã có báo cáo `PENDING` hoặc `PROCESSING`. Không tự báo cáo mình.
- Lý do lấy từ `GET /api/reports/reasons?targetType=...`; FE dịch nhãn sang tiếng Việt. `INVALID_PRICE` chỉ áp dụng tin đăng.
- Mã lý do hiện có: `SCAM` (Lừa đảo), `MISLEADING_INFORMATION` (Thông tin sai lệch), `INVALID_PRICE` (Giá không chính xác), `UNSAFE_CONDITION` (Điều kiện không an toàn), `INAPPROPRIATE_CONTENT` (Nội dung không phù hợp), `OTHER` (Khác).
- Mô tả tối đa 5.000 ký tự; chọn “Khác” phải có nội dung sau khi trim.
- Luồng trạng thái: `PENDING` → `PROCESSING` → `RESOLVED` hoặc `REJECTED`. Chỉ admin đã nhận xử lý mới được kết thúc; ghi chú kết quả bắt buộc, tối đa 5.000 ký tự.
- Tối đa 5 ảnh JPEG/PNG, mỗi ảnh tối đa 5 MiB, chiều rộng và chiều cao không quá 4.096 px. BE kiểm tra nội dung ảnh thực.
- Tạo report trước bằng JSON, sau đó upload từng ảnh qua multipart field `file`. Chỉ bổ sung ảnh khi báo cáo còn `PENDING`; hiện chưa có API xóa ảnh, sửa/hủy hoặc mở lại báo cáo.
- Nội dung minh chứng là dữ liệu riêng tư: tải bằng HttpClient có Bearer token dưới dạng Blob, tạo object URL để hiển thị và thu hồi khi đóng/chuyển trang. Không gắn trực tiếp URL API vào `<img>` vì interceptor không chạy cho request ảnh của trình duyệt.
- API resolve/reject chỉ ghi nhận kết quả báo cáo và thông báo cho tenant; không tự ẩn tin, khóa tài khoản hay ẩn review.

## 3. Các màn hình và điểm tích hợp

### A. Chi tiết tin đăng `/tro/:id`

- Thêm phần “Đánh giá” sau thông tin cơ sở/phòng: hai tab “Phòng / cơ sở” và “Chủ trọ”.
- Tab phòng có lựa chọn “Toàn bộ cơ sở” hoặc phòng cụ thể; đồng bộ với phòng đang chọn nhưng phải hiển thị rõ phạm vi.
- Khối đầu gồm điểm trung bình, số lượt và phân bố 5–1 sao; bên dưới là danh sách phân trang, mỗi lần 10 review.
- Mỗi review có tên/avatar tác giả, sao, nhận xét nếu có, ngày gửi và phản hồi chủ trọ nếu có. Không tự thêm huy hiệu xác minh dựa trên dữ liệu không được API cung cấp.
- Nút “Báo cáo tin đăng” đặt ở nhóm thao tác phụ; nút “Báo cáo chủ trọ” đặt cạnh thông tin chủ trọ. Tenant thao tác; khách chuyển đăng nhập và giữ URL quay lại, các vai trò khác không có nút gửi.
- Viết đánh giá dẫn người dùng tới hợp đồng của họ để bảo đảm đúng `rentalAgreementId`; không cho nhập ID hợp đồng thủ công từ trang public.
- Tách component đánh giá để dùng lại trong dialog chi tiết public nếu dialog đó vẫn là điểm truy cập được sử dụng.

### B. Trang hợp đồng dùng chung

- Tích hợp vào `/hop-dong/:id` và `/landlord/agreements/:id` bằng component “Đánh giá sau khi thuê”.
- Tenant thấy hai mục riêng: “Đánh giá phòng” và “Đánh giá chủ trọ”; landlord thấy “Đánh giá người thuê”. Admin không gọi eligibility vì endpoint chỉ hỗ trợ tenant/landlord.
- Mỗi mục có trạng thái “Có thể đánh giá”, “Đã đánh giá” hoặc lý do chưa đủ điều kiện. Khi chưa đến ngày thuê, giải thích bằng nội dung tiếng Việt.
- Form dùng chọn sao hỗ trợ bàn phím, textarea và bộ đếm ký tự. Khóa nút khi đang gửi; sau thành công tải lại eligibility và lịch sử liên quan.
- Nếu đã có review, mở review của chính tác giả qua dữ liệu `reviews/mine`, đối chiếu `rentalAgreementId`/`reviewId`; không giả định đã có API GET review theo ID.
- Khi đã bổ sung ID đối tác vào response hợp đồng, tenant có thể báo cáo chủ trọ tại đây; landlord xem đánh giá người thuê trong phạm vi được phép.

### C. “Đánh giá của tôi” cho tenant

- Route đề xuất `/danh-gia-cua-toi`, có guard TENANT và liên kết trong menu tài khoản.
- Tab “Tôi đã viết”: chuyển loại `ROOM` / `LANDLORD`, lấy `GET /api/reviews/mine?type=...`.
- Tab “Đánh giá về tôi”: dùng API review người thuê với ID session hiện tại; chỉ nhận review không bị ẩn.
- Bài đã viết hiển thị trạng thái ẩn và lý do từ `ReviewDetailResponse`; không có nút sửa/xóa hay gửi lại.
- Liên kết hợp đồng dựa trên `rentalAgreementId`. Tên phòng/cơ sở cần lấy từ dữ liệu hợp đồng được phép truy cập hoặc response bổ sung; tránh gọi chi tiết hàng loạt chỉ để trang trí từng dòng.

### D. “Báo cáo của tôi” cho tenant

- Routes đề xuất `/bao-cao-cua-toi`, `/bao-cao-cua-toi/:id`, guard TENANT.
- Danh sách lọc theo trạng thái, hiển thị loại đối tượng, lý do, ngày gửi, trạng thái và nút chi tiết; phân trang từ BE.
- Trang chi tiết gồm mô tả, minh chứng, trạng thái hiện tại và kết quả xử lý khi có. Chỉ trình bày các mốc BE thực sự trả (`createdAt`, `resolvedAt`); không dựng lịch sử chuyển trạng thái hoặc thời gian tiếp nhận giả từ `updatedAt`.
- Cho bổ sung ảnh khi còn `PENDING` và chưa đủ 5 ảnh. Mỗi ảnh có trạng thái tải riêng và nút thử lại khi lỗi.
- Dialog gửi báo cáo gồm đối tượng đã chọn, lý do, mô tả, chọn ảnh và preview. Đối tượng được truyền từ ngữ cảnh, không nhập UUID.
- Sau khi tạo thành công phải giữ `reportId` ngay. Nếu ảnh lỗi, thông báo “Báo cáo đã gửi, một số ảnh chưa tải lên”, cho retry ảnh; không POST tạo report lại.
- Nếu admin nhận báo cáo trong lúc upload, tải lại chi tiết và dừng bổ sung ảnh theo trạng thái mới. Không giả định tạo report + upload là một giao dịch nguyên tử.

### E. Dashboard đánh giá của landlord

- Route đề xuất `/landlord/reviews`, thêm vào sidebar của landlord.
- Tab “Đã đánh giá người thuê” dùng `reviews/mine?type=TENANT` và liên kết hợp đồng.
- Tab “Đánh giá nhận được” chia phòng/chủ trọ, có phản hồi hiện tại và form gửi/cập nhật phản hồi.
- Để tab nhận được bao phủ cả tin hết hạn và xác định đúng quyền phản hồi, cần API owner riêng như mục 5. Với BE hiện tại chỉ có thể làm phương án giới hạn: mở review tại tin còn public; không gọi đây là toàn bộ lịch sử.
- Không hiện form trả lời trên review người thuê hoặc review bị ẩn. Đánh giá người thuê có thể xem trong hợp đồng sau khi có `tenantId`.

### F. Admin quản lý báo cáo

- Routes đề xuất `/admin/reports`, `/admin/reports/:id`; thêm mục sidebar.
- Bốn bộ đếm trạng thái lấy từ `GET /api/admin/reports/summary` và dùng để chuyển bộ lọc.
- Tái sử dụng management table: mã báo cáo, loại đối tượng, lý do, trạng thái, người nhận xử lý và ngày gửi. Bộ lọc BE hiện hỗ trợ status/reasonCode; chưa có tìm kiếm toàn hệ thống, lọc loại đối tượng, lọc người nhận hoặc khoảng ngày.
- Chi tiết desktop: nội dung và ảnh bên trái, xử lý bên phải; mobile xếp một cột.
- `PENDING`: nút “Nhận xử lý”. `PROCESSING`: chỉ admin có session ID bằng `handledBy` thấy nút “Giải quyết” / “Từ chối” và form kết quả. Admin khác xem chỉ đọc.
- Sau mutation tải lại chi tiết, danh sách và summary. Nếu admin khác đã nhận trước, hiển thị lỗi xung đột rõ ràng và cập nhật trạng thái.
- Dùng các màn quản lý tin/người dùng hiện có cho thao tác xử lý bổ sung được hỗ trợ; kết thúc report không đồng nghĩa tự động thực hiện các thao tác đó.

### G. Admin kiểm duyệt review

- Route đề xuất `/admin/reviews`, thêm mục sidebar.
- Ba tab `ROOM`, `LANDLORD`, `TENANT`; bộ lọc hiển thị/ẩn/tất cả và `targetId` khi có ngữ cảnh phù hợp.
- Dòng hoặc drawer chi tiết gồm nội dung, sao, tác giả, phản hồi, hợp đồng và metadata kiểm duyệt. DTO hiện chưa có targetId/tên đối tượng; chỉ hiển thị thông tin thực có, hoặc dùng response bổ sung theo mục 5.
- Ẩn review yêu cầu lý do tối đa 500 ký tự; khôi phục gửi `hidden: false`.
- Review bị ẩn biến mất khỏi danh sách công khai và không góp vào điểm tổng hợp. Sau thao tác làm mới dữ liệu đang hiển thị và vô hiệu hóa cache có liên quan nếu đã dùng cache.

## 4. Thiết kế kỹ thuật FE

### Tổ chức mã

```text
core/models/review/                  # DTO request/response, model, mapper nếu cần
core/models/report/
core/services/review/review.service.ts
core/services/report/report.service.ts
shared/components/review-summary/
shared/components/review-list/
shared/components/review-form-dialog/
shared/components/agreement-review-panel/
shared/components/review-reply-form/
shared/components/report-form-dialog/
shared/components/report-evidence-gallery/
shared/components/report-status/
features/tenant/review/              # Đánh giá của tôi
features/tenant/report/              # Danh sách và chi tiết báo cáo của tôi
features/landlord/review/            # Đánh giá nhận được / đã viết
features/admin/review-management/
features/admin/report-management/
```

- Component tách `.ts`, `.html`, `.scss` theo `docs/RULE.md`; standalone, OnPush, signals và hủy subscription theo lifecycle như code hiện tại.
- Đọc và tái sử dụng design tokens trong `src/styles.scss`, dialog Material, dashboard layout, management table và phân trang hiện có.
- Services theo domain dùng HttpClient với `environment.apiUrl`, `ApiResponse<T>`, `PageResponse<T>`, tương tự `RentalService`. Không gắn nghiệp vụ review/report vào BillingApiService.
- Dữ liệu summary: JSON key của `distribution` là chuỗi `"1"`…`"5"`; chuyển kiểu ở mapper nếu model dùng số. Giữ `averageRating` nullable.
- Review public và review detail là hai kiểu khác nhau; report detail bọc `{report, evidences}`. Không flatten thiếu chủ đích khiến UI giả định field không tồn tại.
- Các endpoint dùng tiền tố `/api` phía BE; không nhân đôi `/api` khi xây URL từ `environment.apiUrl`. Tải minh chứng theo report/evidence ID qua service, không biến một URL bất kỳ thành request có token.
- FormData giữ tên field `file`; để trình duyệt tự tạo multipart boundary.
- Page bắt đầu từ 0, size mặc định 10 và không quá 50. Đổi tab/filter phải reset page; lưu filter/tab vào query params để quay lại trang đúng trạng thái.
- Phân biệt loading, dữ liệu rỗng và lỗi; lỗi phần review không làm mất toàn bộ trang tin. Hủy request cũ khi đổi tin/phòng/tab để tránh dữ liệu phản hồi sai thứ tự.
- Khóa thao tác trong lúc submit. Không tự retry mutation; refresh dữ liệu sau lỗi trùng hoặc xung đột và chỉ retry upload từng ảnh theo lựa chọn người dùng.
- Nội dung nhận xét, phản hồi, mô tả hiển thị dưới dạng text; không render HTML từ người dùng.
- Badge trạng thái có nhãn, không chỉ dùng màu; hỗ trợ focus, keyboard cho sao/dialog, alt cho ảnh và layout mobile.

### Hợp đồng API cần nối

Tất cả đường dẫn bên dưới có tiền tố `/api`.

Review:

- `GET /rental-agreements/{id}/review-eligibility`.
- `POST /reviews/rooms`, `/reviews/landlords`, `/reviews/tenants`.
- `GET /reviews/mine?type=ROOM|LANDLORD|TENANT&page=0&size=10`.
- `GET /listings/{listingId}/reviews` và `/reviews/summary`.
- `GET /listings/{listingId}/rooms/{roomId}/reviews` và `/reviews/summary`.
- `GET /landlords/{id}/reviews` và `/reviews/summary`.
- `GET /tenants/{id}/reviews` và `/reviews/summary` với quyền tương ứng.
- `PUT /reviews/rooms/{id}/reply`, `/reviews/landlords/{id}/reply`, body `{reply}`.
- `GET /admin/reviews?type=...&hidden=...&targetId=...&page=0&size=10`; bỏ `hidden` để lấy tất cả.
- `PATCH /admin/reviews/{type}/{id}/visibility`, body `{hidden, reason}`. `type` tại đây là enum viết hoa.

Report:

- `GET /reports/reasons?targetType=LISTING|LANDLORD`.
- `POST /reports`, body `{targetType, targetId, reasonCode, description}`.
- `GET /reports/mine?status=...&page=0&size=10`.
- `GET /reports/{id}` cho tác giả hoặc admin.
- `POST /reports/{id}/evidences`, multipart `file`; `GET /reports/{id}/evidences/{evidenceId}/content`, response Blob.
- `GET /admin/reports?status=...&reasonCode=...&page=0&size=10`.
- `GET /admin/reports/summary`.
- `POST /admin/reports/{id}/assign` nhận xử lý cho chính admin đang đăng nhập, không phải chọn người khác.
- `POST /admin/reports/{id}/resolve` hoặc `/reject`, body `{resolutionNote}`.

## 5. Khoảng trống API và cách triển khai

### Cần bổ sung để hoàn chỉnh trải nghiệm

1. **ID đối tác trong hợp đồng:** `RentalAgreementResponse` và `RentalRequestResponse` hiện chỉ có tên đối tác. Đề xuất thêm `tenantId`, `landlordId` vào response hợp đồng cho các bên có quyền. Tạo review không bị chặn vì chỉ cần agreement ID; xem review tenant và báo cáo landlord trực tiếp từ hợp đồng cần các ID này. Không suy ID từ tên.
2. **Danh sách review nhận được của landlord:** public API của landlord yêu cầu có tin public, public API phòng cũng đi qua listing còn hợp lệ. `reviews/mine` là review do mình viết. Đề xuất endpoint được bảo vệ `GET /landlord/reviews?type=ROOM|LANDLORD&...`, BE tự lọc chủ sở hữu và trả ngữ cảnh phòng/hợp đồng, `canReply` cùng metadata tối thiểu cần thiết. Phải kiểm tra quyền tại BE; không dùng API admin hoặc tải toàn hệ thống rồi lọc FE.
3. **Ngữ cảnh đối tượng cho trang quản lý:** `ReviewDetailResponse` chưa có targetId/tên phòng/chủ trọ/người thuê; `ReportResponse` chưa có tên đối tượng hoặc tên admin xử lý. Đề xuất enrich response được bảo vệ bằng trường tối thiểu cần cho UI. Nếu chưa bổ sung, bản đầu có thể hiển thị mã, dữ liệu hợp đồng sẵn có và không tự dựng tên hay thêm N+1 request.

### Cải tiến sau bản đầu

- API điều kiện báo cáo để UI biết trước đã có report mở hoặc chưa có hợp đồng; hiện xử lý theo kết quả POST và thông báo `REPORT_ALREADY_OPEN`, `REPORT_CONTRACT_REQUIRED`.
- Liên kết tới report đang mở từ lỗi trùng: hiện lỗi chưa cung cấp reportId; trước mắt dẫn “Báo cáo của tôi” và đối chiếu danh sách của tenant.
- Trả `canAssign`, `canResolve`, `canUploadEvidence` để giảm lặp logic capability; BE vẫn là nơi quyết định quyền.
- Tích hợp thông báo: BE đã lưu notification loại `REPORT`, nhưng FE hiện chưa có luồng notification nghiệp vụ. Chỉ nối deep link `/bao-cao-cua-toi/:id` khi triển khai phần thông báo; bản đầu dùng trang lịch sử và tải lại thủ công.
- Điểm trên room card: hiện dữ liệu thật trả về getter điểm/số lượt bằng 0. Nếu hiển thị rating ở danh sách, cần BE trả summary theo batch hoặc kèm listing response; không gọi hai API review cho mỗi card và không dùng điểm mock.
- Tìm kiếm, lọc sao, lọc ngày, sắp xếp khác mặc định, phân công lại và audit timeline đầy đủ cần API bổ sung; chưa đưa thành tính năng có sẵn.

## 6. Thứ tự thực hiện và đầu ra

1. **Chốt contract và nền tảng:** thống nhất ba khoảng trống API ở mục 5; tạo models, services, nhãn tiếng Việt, xử lý phân trang và ảnh Blob. Đầu ra: FE gọi đúng API và phân biệt DTO public/private.
2. **Review cốt lõi:** thêm review summary/list ở chi tiết tin, eligibility và form ở hợp đồng, trang đánh giá của tôi. Đầu ra: tenant đánh giá phòng/chủ trọ, landlord đánh giá tenant, không đánh giá trùng hoặc sai điều kiện.
3. **Report cho tenant:** dialog tạo, upload từng ảnh, lịch sử và chi tiết. Đầu ra: gửi report, giữ kết quả khi upload lỗi một phần và xem trạng thái xử lý.
4. **Admin report:** danh sách, summary, chi tiết, nhận xử lý và kết thúc. Đầu ra: toàn bộ luồng tenant gửi → admin nhận → resolve/reject → tenant xem kết quả.
5. **Admin review và phản hồi landlord:** ẩn/khôi phục, dashboard review nhận được khi owner API sẵn sàng, phản hồi và xem review tenant đúng quyền. Đầu ra: kiểm duyệt và tương tác đầy đủ.
6. **Hoàn thiện:** responsive, accessibility, thông báo lỗi có ngữ cảnh, cache invalidation nếu có; chạy build và test các luồng trọng yếu.

Ưu tiên demo hoàn chỉnh luồng report ở bước 3–4 và luồng review ở bước 2 trước khi mở rộng bộ lọc hoặc notification.

## 7. Tiêu chí nghiệm thu và kiểm tra

- Guest xem review public; tenant/landlord/admin chỉ truy cập đúng route và nút theo quyền. Review tenant không xuất hiện công khai.
- Hợp đồng chưa xác nhận/chưa đến ngày bắt đầu không gửi review; hợp đồng hợp lệ tạo đúng loại và mỗi loại một lần. Admin vào trang hợp đồng không gọi nhầm eligibility.
- Tenant gửi hai review độc lập; một request lỗi không làm mất review đã thành công. Chọn sao bằng bàn phím; giới hạn ký tự đúng BE.
- Đổi phòng/tin nhanh không hiển thị review của đối tượng trước. Không có review hiển thị đúng `null`, không giả 0 sao.
- Review bị ẩn không thể tạo lại; public list và summary tải mới cùng loại bỏ review đó. Landlord chỉ phản hồi review thuộc mình và còn hiển thị.
- Report dùng đúng lý do theo target, `OTHER` không chấp nhận mô tả trắng; trùng report mở và báo cáo landlord chưa có quan hệ hợp đồng có thông báo rõ ràng.
- Upload từ chối file sai định dạng, quá dung lượng/kích thước hoặc quá 5 ảnh; retry ảnh lỗi không tạo report thứ hai. Chuyển PROCESSING trong lúc upload phải dừng bổ sung đúng trạng thái.
- Ảnh minh chứng tải bằng request xác thực; người ngoài và landlord không xem được. Object URL được thu hồi khi ngừng dùng.
- Hai admin nhận cùng lúc chỉ một người thành công; người khác không kết thúc report. Resolve/reject bắt buộc ghi chú; refresh summary và detail sau xử lý.
- HTTP service tests kiểm tra đường dẫn, query/body, response wrapper, Blob/FormData; component/route tests tập trung eligibility, quyền và các trường hợp lỗi một phần/xung đột nêu trên.
- Chạy `npm run build`, các spec liên quan bằng `npm test -- --watch=false`, sau đó kiểm tra trình duyệt desktop/mobile với BE và dữ liệu hợp lệ. Chỉ chạy lại/bổ sung kiểm tra khi có thay đổi hoặc lỗi cần xác minh.

Chưa chạy build/test ở bước lập kế hoạch vì chưa thay đổi mã ứng dụng. Các khả năng mô tả trong tài liệu được đối chiếu source, chưa xác nhận trên BE đang chạy.
