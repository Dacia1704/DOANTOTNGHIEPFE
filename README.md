# DOANTOTNGHIEPFE — frontend

Frontend Angular cho hệ thống cho thuê trọ. Khởi chạy toàn hệ thống, cấu hình môi trường và seed: [hướng dẫn chung](../AIService/README.md).

| Tài liệu | Nội dung |
| --- | --- |
| [Hướng dẫn giao diện](docs/UI.md) | Cơ sở/tin đăng, cây loại phòng, bản đồ, hợp đồng, review/report, phân quyền/chat, smoke test |
| [Quy tắc phát triển](docs/RULE.md) | Component, design tokens, model/mapper/service và shared utils |
| [API chung tại backend](../RentalManagement/docs/api.md) | Nguồn contract duy nhất; không sao chép API sang FE |
| [Nghiệp vụ backend](../RentalManagement/docs/BUSINESS.md) | Quota, giao dịch, snapshot và PDF |
| [Vận hành backend](../RentalManagement/docs/OPERATIONS.md) | VNPay, thông báo, database và kiểm thử tích hợp |
| [Management table](src/app/shared/components/management-table/README.md) | Cách dùng component bảng chung |
| [Ngữ cảnh mô phỏng](postman/simulations/rental-property-ui.context.md) | Nguồn fixture, giới hạn và bằng chứng smoke; đi kèm context.yaml |

Các hướng dẫn UI được duy trì trong docs/UI.md; quy tắc phát triển trong docs/RULE.md. Không tạo file kế hoạch/biên bản task mới cho tính năng đã có tài liệu.
