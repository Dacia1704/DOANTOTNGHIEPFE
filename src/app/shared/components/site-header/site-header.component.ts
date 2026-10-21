import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@services/auth.service';
import { ImageUtils } from '@shared/utils/image-utils';
import { RoleCode } from '@model/auth/auth.model';

interface NavLink {
  label: string;
  route: string;
  exact?: boolean;
}

/**
 * Glass header dùng cho toàn bộ trang public của tenant (landing, room-list, ...).
 * - Guest: hiển thị nút "Đăng nhập" / "Đăng ký".
 * - Đã login: hiển thị avatar + dropdown (Hồ sơ, Tin đã lưu, Phòng của tôi, Cài đặt, Đăng xuất).
 *
 * Component dùng signal `auth.session()` để reactive — header tự cập nhật khi login/logout.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, MatMenuModule, MatDividerModule],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeaderComponent {
  @Input() adminMode = false;

  get isAdmin(): boolean { return this.auth.primaryRole() === RoleCode.ADMIN; }

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly imageUtils = ImageUtils;

  readonly navLinks: readonly NavLink[] = [
    { label: 'Thuê phòng', route: '/', exact: true },
    { label: 'Ghép phòng', route: '/o-ghep' },
    { label: 'Cho thuê / Đăng tin', route: '/dang-tin' },
    { label: 'Cẩm nang thuê trọ', route: '/cam-nang' },
  ];

  /** Lấy session hiện tại qua signal (reactive). */
  readonly session = this.auth.session;

  readonly isLoggedIn = this.auth.isLoggedIn;

  get displayName(): string {
    return this.session()?.fullName ?? '';
  }

  get userAvatar(): string {
    return this.imageUtils.toImageSrc(this.session()?.avatarUrl, 'avatar-default.jpg');
  }

  /** Trả về role hiển thị tiếng Việt cho menu user. */
  roleLabel(): string {
    switch (this.auth.primaryRole()) {
      case RoleCode.ADMIN: return 'Quản trị viên';
      case RoleCode.LANDLORD: return 'Chủ trọ';
      case RoleCode.TENANT: return 'Người thuê';
      default: return 'Thành viên';
    }
  }

  get profileUrl(): string {
    return this.auth.primaryRole() === RoleCode.ADMIN ? '/admin/profile' : '/trang-ca-nhan';
  }

  logout(): void {
    this.auth.logout();
  }

  /** Click "Đăng tin mới" — điều hướng nhanh nếu đã login. */
  postListing(): void {
    if (this.isLoggedIn()) {
      this.router.navigate(['/dang-tin']);
    } else {
      this.router.navigate(['/login'], { queryParams: { redirect: 'dang-tin' } });
    }
  }
}
