import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from '@shared/components/site-header/site-header.component';
import { SiteFooterComponent } from '@shared/components/site-footer/site-footer.component';
import { MobileBottomNavComponent } from '@shared/components/mobile-bottom-nav/mobile-bottom-nav.component';

/**
 * Shell dùng cho mọi trang public của tenant:
 *  - Site header (fixed) — tự cập nhật theo AuthService.session signal.
 *  - <main> chừa padding-top để không bị header che.
 *  - Footer cố định layout.
 *  - Mobile bottom nav (chỉ hiển thị < md).
 */
@Component({
  selector: 'app-tenant-layout',
  imports: [
    RouterOutlet,
    SiteHeaderComponent,
    SiteFooterComponent,
    MobileBottomNavComponent,
  ],
  templateUrl: './tenant-layout.component.html',
  styleUrl: './tenant-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantLayoutComponent {}
