import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  icon: string;
  label: string;
  route: string;
}

/** Menu điều hướng dùng chung cho dashboard admin và landlord. */
@Component({
  selector: 'app-nav-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-sidebar.component.html',
  styleUrl: './nav-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavSidebarComponent {
  @Input() menu: NavItem[] = [];
  @Input() collapsed = false;
  @Input() label = 'Điều hướng';
}
