import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface BottomNavItem {
  icon: string;
  label: string;
  route: string;
}

/**
 * Mobile bottom nav (chỉ hiện dưới `md`). Tương tự các app marketplace:
 * 5 tab — Khám phá / Bản đồ / Yêu thích / Tin nhắn / Tài khoản.
 */
@Component({
  selector: 'app-mobile-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrl: './mobile-bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileBottomNavComponent {
  readonly items: readonly BottomNavItem[] = [
    { icon: 'explore', label: 'Khám phá', route: '/' },
    { icon: 'map', label: 'Bản đồ', route: '/ban-do' },
    { icon: 'favorite_border', label: 'Yêu thích', route: '/phong-da-luu' },
    { icon: 'chat_bubble_outline', label: 'Tin nhắn', route: '/tin-nhan' },
    { icon: 'account_circle', label: 'Tài khoản', route: '/trang-ca-nhan' },
  ];
}
