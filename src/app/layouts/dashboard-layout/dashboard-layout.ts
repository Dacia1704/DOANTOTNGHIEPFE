import {
  ChangeDetectionStrategy,
  Component,
  Input,
  DestroyRef,
  OnChanges,
  inject,
  signal,
} from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { A11yModule } from '@angular/cdk/a11y';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavItem, NavSidebarComponent } from '@shared/components/nav-sidebar/nav-sidebar.component';
import { SiteHeaderComponent } from '@shared/components/site-header/site-header.component';

@Component({
  selector: 'app-dashboard-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    MatSidenavModule,
    A11yModule,
    NavSidebarComponent,
    SiteHeaderComponent,
  ],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutComponent implements OnChanges {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly mobile = signal(false);
  readonly collapsed = signal(false);
  readonly pageLabel = signal('Quản trị');
  @Input({ required: true }) menu: NavItem[] = [];
  @Input() title = 'Quản trị';
  @Input() home = '/admin';
  @Input() heading = 'Quản trị hệ thống';
  @Input() mode: 'admin' | 'landlord' = 'admin';

  constructor() {
    this.breakpoints
      .observe(['(max-width: 767px)', '(max-width: 1279px)'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        const mobile = result.breakpoints['(max-width: 767px)'];
        this.mobile.set(mobile);
        this.collapsed.set(result.breakpoints['(max-width: 1279px)']);
      });
    this.updateBreadcrumb();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.updateBreadcrumb();
        if (this.mobile()) this.collapsed.set(true);
      });
  }

  toggleSidebar(): void {
    this.collapsed.update((value) => !value);
  }

  ngOnChanges(): void {
    this.updateBreadcrumb();
  }

  private updateBreadcrumb(): void {
    const path = this.router.url.split(/[?#]/)[0];
    this.pageLabel.set(
      this.menu.find((item) => path === item.route || path.startsWith(item.route + '/'))?.label ??
        this.title,
    );
  }
}
