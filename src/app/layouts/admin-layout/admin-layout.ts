import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
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
    { icon: 'forum', label: 'Tin nhắn & hỗ trợ', route: '/admin/messages' },
    { icon: 'inventory_2', label: 'Gói dịch vụ & Boost', route: '/admin/service-packages' },
    { icon: 'receipt_long', label: 'Quản lý thanh toán', route: '/admin/payments' },
    { icon: 'fact_check', label: 'Quản lý bài đăng', route: '/admin/listings' },
    { icon: 'flag', label: 'Quản lý báo cáo', route: '/admin/reports' },
    { icon: 'reviews', label: 'Quản lý đánh giá', route: '/admin/reviews' },
    { icon: 'manage_accounts', label: 'Quản lý người dùng', route: '/admin/users' },
    { icon: 'admin_panel_settings', label: 'Phân quyền & vai trò', route: '/admin/roles' },
    { icon: 'apartment', label: 'Loại cơ sở cho thuê', route: '/admin/property-types' },
    { icon: 'category', label: 'Quản lý loại phòng', route: '/admin/room-types' },
    { icon: 'local_convenience_store', label: 'Quản lý tiện ích', route: '/admin/amenities' },
    { icon: 'location_on', label: 'Quản lý phường/xã', route: '/admin/wards' },
  ];
  get menu(): NavItem[] {
    const readPermissions: Record<string, string> = {
      '/admin/users': 'USER_READ',
      '/admin/reviews': 'REVIEW_READ',
      '/admin/reports': 'REPORT_READ',
      '/admin/roles': 'ROLE_PERMISSION_READ',
    };
    return this.items.filter(
      (item) =>
        !readPermissions[item.route] || this.auth.hasPermission(readPermissions[item.route]),
    );
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
