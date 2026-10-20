import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  icon: string;
  label: string;
  route: string;
}

/**
 * Minimal sidebar dùng cho admin layout — TODO sẽ dùng layout admin riêng
 * khi có trang quản trị thật cho TroTot. Hiện tại chỉ render danh sách link.
 */
@Component({
  selector: 'app-nav-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-sidebar.component.html',
  styleUrl: './nav-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavSidebarComponent {
  @Input() menu: NavItem[] = [];
}
