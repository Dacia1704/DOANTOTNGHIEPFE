import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NavItem } from '@shared/components/nav-sidebar/nav-sidebar.component';
import { DashboardLayoutComponent } from '../dashboard-layout/dashboard-layout';

@Component({
  selector: 'app-landlord-layout',
  imports: [DashboardLayoutComponent],
  templateUrl: './landlord-layout.html',
  styleUrl: './landlord-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandlordLayout {
  readonly menu: NavItem[] = [
    { icon: 'real_estate_agent', label: 'Quản lý cơ sở & phòng', route: '/phong-cua-toi' },
    { icon: 'article', label: 'Quản lý tin đăng', route: '/tin-cua-toi' },
    { icon: 'event_available', label: 'Đặt phòng & hợp đồng', route: '/quan-ly-dat-phong' },
    { icon: 'forum', label: 'Tin nhắn & hỗ trợ', route: '/landlord/messages' },
    { icon: 'inventory_2', label: 'Gói dịch vụ', route: '/goi-dich-vu' },
    { icon: 'bolt', label: 'Gói suất Boost', route: '/boost' },
    { icon: 'receipt_long', label: 'Lịch sử thanh toán', route: '/lich-su-thanh-toan' },
    { icon: 'person', label: 'Hồ sơ cá nhân', route: '/landlord/profile' },
  ];
}
