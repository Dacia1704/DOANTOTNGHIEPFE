import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ImageUtils } from '@shared/utils/image-utils';
import { TextUtils } from '@shared/utils/text-utils';
import { RoomCard } from '../../data/landing.mock';

/**
 * Card hiển thị một phòng — dùng cho cả section "Gợi ý AI" và danh sách phòng chính.
 * Vì cả 2 section ở landing page dùng cùng layout card (chỉ khác badge match-percent),
 * nên component này nhận `RoomCard` mock làm input chung.
 *
 * Action: emit `wishlistToggle` và `cardClick` để landing-page xử lý (hiện không cần
 * routing thật — chỉ stub).
 */
@Component({
  selector: 'app-room-card',
  imports: [],
  templateUrl: './room-card.component.html',
  styleUrl: './room-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomCardComponent {
  @Input({ required: true }) room!: RoomCard;

  @Output() wishlistToggle = new EventEmitter<RoomCard>();
  @Output() cardClick = new EventEmitter<RoomCard>();

  readonly imageUtils = ImageUtils;
  readonly textUtils = TextUtils;

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN');
  }

  onWishlist(event: Event): void {
    event.stopPropagation();
    this.wishlistToggle.emit(this.room);
  }

  onClick(): void {
    this.cardClick.emit(this.room);
  }
}
