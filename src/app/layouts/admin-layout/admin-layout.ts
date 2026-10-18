import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { AuthService } from '@services/auth.service';
import { NavItem, Sidebar } from '@shared/components/sidebar/sidebar';
import { Topbar } from '@shared/components/topbar/topbar';

@Component({
  selector: 'app-admin-layout',
  imports: [
    RouterOutlet,
    Sidebar,
    Topbar,
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  goToProfile(): void {
    this.router.navigate(['/admin/profile']);
  }

  readonly menu: NavItem[] = [
    {
      icon: 'manage_accounts',
      label: 'Quản lý người dùng',
      route: '/admin/users',
    },
  ];

  logout(): void {
    this.auth.logout();
  }
}
