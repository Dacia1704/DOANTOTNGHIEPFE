import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NavItem } from '@shared/components/nav-sidebar/nav-sidebar.component';
import { DashboardLayoutComponent } from '../dashboard-layout/dashboard-layout';

@Component({
  selector: 'app-admin-layout',
  imports: [DashboardLayoutComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  readonly menu: NavItem[] = [
    { icon: 'forum', label: 'Tin nhắn & hỗ trợ', route: '/admin/messages' },
    { icon: 'inventory_2', label: 'Gói dịch vụ & Boost', route: '/admin/service-packages' },
    { icon: 'receipt_long', label: 'Quản lý thanh toán', route: '/admin/payments' },
    { icon: 'fact_check', label: 'Quản lý bài đăng', route: '/admin/listings' },
    { icon: 'manage_accounts', label: 'Quản lý người dùng', route: '/admin/users' },
    { icon: 'apartment', label: 'Loại cơ sở cho thuê', route: '/admin/property-types' },
    { icon: 'category', label: 'Quản lý loại phòng', route: '/admin/room-types' },
    { icon: 'local_convenience_store', label: 'Quản lý tiện ích', route: '/admin/amenities' },
    { icon: 'location_on', label: 'Quản lý phường/xã', route: '/admin/wards' },
  ];
}
