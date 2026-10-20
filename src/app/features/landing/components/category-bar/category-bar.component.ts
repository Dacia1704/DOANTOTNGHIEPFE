import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CATEGORY_PILLS, CategoryPill } from '../../data/landing.mock';

/**
 * Thanh pill ngang các "loại phòng" — copy nguyên style từ landing-page.html.
 * Statik — không có tương tác filtering (chỉ để hiển thị chip).
 */
@Component({
  selector: 'app-category-bar',
  imports: [],
  templateUrl: './category-bar.component.html',
  styleUrl: './category-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBarComponent {
  readonly pills: CategoryPill[] = CATEGORY_PILLS;
}
