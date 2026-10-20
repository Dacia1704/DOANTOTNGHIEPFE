import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PRICE_OPTIONS,
  ROOM_TYPE_OPTIONS,
} from '../../data/landing.mock';

/**
 * Capsule search bar (Airbnb-style): Khu vực / Khoảng giá / Loại hình + nút Tìm kiếm.
 * Mỗi ô có icon tròn + label phụ + input/select. Hiện tại chỉ bind 2 chiều qua signal —
 * khi backend có API search thật sẽ phát emit `search` để landing-page điều hướng.
 */
@Component({
  selector: 'app-search-capsule',
  imports: [FormsModule],
  templateUrl: './search-capsule.component.html',
  styleUrl: './search-capsule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchCapsuleComponent {
  readonly priceOptions = PRICE_OPTIONS;
  readonly roomTypeOptions = ROOM_TYPE_OPTIONS;

  readonly location = signal('');
  readonly priceRange = signal('all');
  readonly roomType = signal('all');

  onSubmit(event: Event): void {
    event.preventDefault();
    // TODO: kết nối với API search khi BE sẵn sàng.
  }
}
