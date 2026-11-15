import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { EMPTY, catchError, filter, fromEvent, merge, startWith, switchMap } from 'rxjs';
import { AuthService } from '@services/auth/auth.service';
import { NavItem } from '@shared/components/nav-sidebar/nav-sidebar.component';
import { DashboardLayoutComponent } from '../dashboard-layout/dashboard-layout';

@Component({
  selector: 'app-admin-layout',
  imports: [DashboardLayoutComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly items: NavItem[] = [
    { icon: 'space_dashboard', label: 'Tổng quan', route: '/admin/dashboard' },
    {
      id: 'content',
      icon: 'dynamic_feed',
      label: 'Nội dung & cộng đồng',
      children: [
        { icon: 'policy', label: 'Kiểm duyệt cộng đồng', route: '/admin/moderation' },
        { icon: 'fact_check', label: 'Quản lý bài đăng', route: '/admin/listings' },
        { icon: 'flag', label: 'Quản lý báo cáo', route: '/admin/reports' },
        { icon: 'reviews', label: 'Quản lý đánh giá', route: '/admin/reviews' },
        { icon: 'forum', label: 'Tin nhắn & hỗ trợ', route: '/admin/messages' },
      ],
    },
    {
      id: 'billing',
      icon: 'payments',
      label: 'Dịch vụ & thanh toán',
      children: [
        { icon: 'inventory_2', label: 'Gói dịch vụ & Boost', route: '/admin/service-packages' },
        { icon: 'receipt_long', label: 'Quản lý thanh toán', route: '/admin/payments' },
      ],
    },
    {
      id: 'accounts',
      icon: 'manage_accounts',
      label: 'Tài khoản & phân quyền',
      children: [
        { icon: 'group', label: 'Quản lý người dùng', route: '/admin/users' },
        { icon: 'admin_panel_settings', label: 'Phân quyền & vai trò', route: '/admin/roles' },
      ],
    },
    {
      id: 'catalog',
      icon: 'category',
      label: 'Danh mục hệ thống',
      children: [
        { icon: 'apartment', label: 'Loại cơ sở cho thuê', route: '/admin/property-types' },
        { icon: 'category', label: 'Quản lý loại phòng', route: '/admin/room-types' },
        { icon: 'local_convenience_store', label: 'Quản lý tiện ích', route: '/admin/amenities' },
        { icon: 'location_on', label: 'Quản lý phường/xã', route: '/admin/wards' },
      ],
    },
  ];
  readonly menu = computed(() => this.filterMenu(this.items));

  private filterMenu(items: NavItem[]): NavItem[] {
    const readPermissions: Record<string, string> = {
      '/admin/moderation': 'MODERATION_READ',
      '/admin/users': 'USER_READ',
      '/admin/reviews': 'REVIEW_READ',
      '/admin/reports': 'REPORT_READ',
      '/admin/roles': 'ROLE_PERMISSION_READ',
    };
    return items.flatMap((item) => {
      if (item.children) {
        const children = this.filterMenu(item.children);
        return children.length ? [{ ...item, children }] : [];
      }
      const permission = readPermissions[item.route ?? ''];
      return !permission || this.auth.hasPermission(permission) ? [item] : [];
    });
  }
  ngOnInit(): void {
    merge(
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
      fromEvent(window, 'focus'),
    )
      .pipe(
        startWith(null),
        switchMap(() => this.auth.refreshAuthorities().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe();
  }
}
