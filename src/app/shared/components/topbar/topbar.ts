import { Component, inject, output, signal, OnInit, DestroyRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { LoginResponse } from '@model/auth/response/login-response';
import { ImageUtils } from '@shared/utils/image-utils';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  imports: [
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    MatIconModule,
    CommonModule
  ],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar implements OnInit {

  goToProfile = output<void>();
  goToMemberCard = output<void>();
  logoutClick = output<void>();

  private readonly authKey = 'library_auth';


  notifications: Notification[] = [];
  unreadCount = signal(0);
  showNotifications = signal(false);

  get userName(): string {
    return this.getAuth()?.username ?? '';
  }

  /**
   * Avatar dùng cho thẻ <img>.
   * - Nếu user đã có avatar (URL / base64) → chuẩn hoá qua ImageUtils.
   * - Nếu rỗng → fallback sang ui-avatars theo tên hiển thị.
   */
  get userAvatar(): string {
    const avatar = this.getAuth()?.avatar;
    return ImageUtils.toImageSrc(avatar, 'avatar-default.jpg');
  }

  get userBaseRole(): string {
    const authorities = this.getAuth()?.authorities ?? [];
    if (authorities.includes('ROLE_ADMIN')) return "ADMIN";
    if (authorities.includes('ROLE_LIBRARIAN')) return "LIBRARIAN";
    if (authorities.includes('ROLE_MEMBER')) return "MEMBER";
    return "READER";
  }

  get userRole(): string {
    const authorities = this.getAuth()?.authorities ?? [];

    if (authorities.includes('ROLE_ADMIN')) {
      return 'Quản trị viên';
    }

    if (authorities.includes('ROLE_LIBRARIAN')) {
      return 'Thủ thư';
    }

    if (authorities.includes('ROLE_READER')) {
      return 'Độc giả';
    }

    return '';
  }

  private getAuth(): LoginResponse | null {
    const value = localStorage.getItem(this.authKey);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as LoginResponse;
    } catch {
      return null;
    }
  }

  // ===== Notification Methods =====

  ngOnInit(): void {
  }

  toggleNotifications(): void {
    this.showNotifications.set(!this.showNotifications());
  }
}