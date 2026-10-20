import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { NavItem, NavSidebarComponent } from '@shared/components/nav-sidebar/nav-sidebar.component';

/**
 * TODO: Admin shell — chưa có UI admin tương ứng với design TroTot.
 * Hiện chỉ giữ skeleton để không vỡ import. Sẽ được thiết kế lại khi có
 * trang quản trị thật.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, NavSidebarComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly menu: NavItem[] = [
    {
      icon: 'manage_accounts',
      label: 'Quản lý người dùng',
      route: '/admin/users',
    },
  ];

  goToProfile(): void {
    this.router.navigate(['/admin/profile']);
  }

  logout(): void {
    this.auth.logout();
  }
}
