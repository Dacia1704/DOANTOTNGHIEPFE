import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface NavItem {
  icon: string;
  label: string;
  route?: string;
  id?: string;
  children?: NavItem[];
}

export function findNavItem(items: NavItem[], path: string): NavItem | undefined {
  for (const item of items) {
    const child = item.children && findNavItem(item.children, path);
    if (child) return child;
    if (item.route && (path === item.route || path.startsWith(item.route + '/'))) return item;
  }
  return undefined;
}

let nextSidebarId = 0;

/** Menu điều hướng dùng chung cho dashboard admin và landlord. */
@Component({
  selector: 'app-nav-sidebar',
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './nav-sidebar.component.html',
  styleUrl: './nav-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavSidebarComponent implements OnChanges {
  @Input() menu: NavItem[] = [];
  @Input() collapsed = false;
  @Input() label = 'Điều hướng';
  @Output() readonly expand = new EventEmitter<void>();
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly sidebarId = `nav-sidebar-${nextSidebarId++}`;
  readonly expanded = signal(new Set<string>());
  readonly path = signal(this.router.url.split(/[?#]/)[0]);
  get grouped() {
    return this.menu.some((item) => !!item.children?.length);
  }

  constructor() {
    this.router.events.pipe(takeUntilDestroyed(this.destroy)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.path.set(event.urlAfterRedirects.split(/[?#]/)[0]);
        this.openActiveGroups();
      }
    });
  }
  ngOnChanges() {
    this.openActiveGroups();
  }
  key(item: NavItem) {
    return item.id ?? item.route ?? item.label;
  }
  groupId(item: NavItem) {
    return `${this.sidebarId}-${this.key(item).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  }
  active(item: NavItem) {
    return !!findNavItem(item.children ?? [item], this.path());
  }
  toggle(item: NavItem) {
    const key = this.key(item);
    const open = this.collapsed || !this.expanded().has(key);
    this.expanded.update((current) => {
      const next = new Set(current);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
    if (this.collapsed) this.expand.emit();
  }
  private openActiveGroups() {
    const next = new Set(this.expanded());
    const visit = (items: NavItem[]) => {
      for (const item of items)
        if (item.children?.length) {
          if (this.active(item)) next.add(this.key(item));
          visit(item.children);
        }
    };
    visit(this.menu);
    this.expanded.set(next);
  }
}
