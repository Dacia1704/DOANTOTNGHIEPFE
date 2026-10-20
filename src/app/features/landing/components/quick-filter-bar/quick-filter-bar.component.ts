import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ADVANCED_FILTERS, QUICK_FILTERS, QuickFilter } from '../../data/landing.mock';

/**
 * Thanh quick-filter + panel "Bộ lọc tiện ích" nâng cao.
 * Click chip "Bộ lọc tiện ích" → toggle panel.
 */
@Component({
  selector: 'app-quick-filter-bar',
  imports: [],
  templateUrl: './quick-filter-bar.component.html',
  styleUrl: './quick-filter-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickFilterBarComponent {
  readonly filters: QuickFilter[] = QUICK_FILTERS;
  readonly advanced = ADVANCED_FILTERS;
  readonly activeFilter = signal<string>('all');
  readonly showAdvanced = signal(false);

  selectFilter(id: string): void {
    if (id === 'advanced') {
      this.showAdvanced.set(!this.showAdvanced());
      return;
    }
    this.activeFilter.set(id);
  }

  isActive(id: string): boolean {
    return this.activeFilter() === id;
  }
}
