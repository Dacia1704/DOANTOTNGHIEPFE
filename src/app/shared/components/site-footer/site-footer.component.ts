import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FooterColumn {
  title: string;
  links: { label: string; route: string }[];
}

interface QuickArea {
  label: string;
}

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooterComponent {
  readonly columns: FooterColumn[] = [
    {
      title: 'Chính sách an toàn',
      links: [
        { label: 'Quy chuẩn kiểm duyệt phòng trọ', route: '#' },
        { label: 'Giữ cọc an toàn qua TroTot Escrow', route: '#' },
        { label: 'Hợp đồng thuê mẫu & Pháp lý thuê nhà', route: '#' },
        { label: 'Báo cáo tin đăng sai sự thật', route: '#' },
      ],
    },
    {
      title: 'Hỗ trợ & Hướng dẫn',
      links: [
        { label: 'Dành cho tân sinh viên tìm trọ', route: '#' },
        { label: 'Kinh nghiệm chia tiền phòng & điện nước', route: '#' },
        { label: 'Trung tâm trợ giúp chủ phòng trọ', route: '#' },
        { label: 'Quy định đăng tin và phí dịch vụ', route: '#' },
      ],
    },
  ];

  readonly quickAreas: QuickArea[] = [
    { label: 'Bình Thạnh' },
    { label: 'Quận 7' },
    { label: 'Thủ Đức' },
    { label: 'Cầu Giấy' },
    { label: 'Đống Đa' },
    { label: 'Quận 10' },
    { label: 'Bách Khoa' },
  ];

  readonly currentYear = new Date().getFullYear();
}
