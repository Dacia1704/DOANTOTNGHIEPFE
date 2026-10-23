import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { A11yModule } from '@angular/cdk/a11y';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavItem, NavSidebarComponent } from '@shared/components/nav-sidebar/nav-sidebar.component';
import { SiteHeaderComponent } from '@shared/components/site-header/site-header.component';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, MatSidenavModule, A11yModule, NavSidebarComponent, SiteHeaderComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly mobile = signal(false);
  readonly collapsed = signal(false);
  readonly pageLabel = signal('Quản trị');
  readonly menu: NavItem[] = [
    { icon: 'manage_accounts', label: 'Quản lý người dùng', route: '/admin/users' },
<<<<<<< HEAD
    { icon: 'person', label: 'Hồ sơ cá nhân', route: '/admin/profile' },
=======
    { icon: 'location_on', label: 'Quản lý phường/xã', route: '/admin/wards' },
>>>>>>> 1601b9dfb6f37b0f95d9c7f170923e90c3ec0c06
  ];


  constructor() {
    this.breakpoints.observe(['(max-width: 767px)', '(max-width: 1279px)'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        const mobile = result.breakpoints['(max-width: 767px)'];
        this.mobile.set(mobile);
        this.collapsed.set(result.breakpoints['(max-width: 1279px)']);
      });
    this.updateBreadcrumb();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.updateBreadcrumb();
      if (this.mobile()) this.collapsed.set(true);
    });
  }

  toggleSidebar(): void {
    this.collapsed.update(value => !value);
  }

  private updateBreadcrumb(): void {
    const path = this.router.url.split(/[?#]/)[0];
    this.pageLabel.set(this.menu.find(item => path === item.route || path.startsWith(item.route + '/'))?.label ?? 'Quản trị');
  }
}
