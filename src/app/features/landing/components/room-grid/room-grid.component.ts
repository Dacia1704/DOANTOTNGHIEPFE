import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoomCardComponent } from '../room-card/room-card.component';
import { ROOM_LISTINGS, RoomCard, SORT_OPTIONS } from '../../data/landing.mock';

/**
 * Danh sách phòng chính + select sort. Sort hiện chỉ là client-side mock:
 *  - newest | rating: trả nguyên danh sách
 *  - price-asc: sort theo price tăng dần
 *  - distance: giả ngẫu nhiên (sort theo reviewCount làm proxy)
 */
@Component({
  selector: 'app-room-grid',
  imports: [FormsModule, RoomCardComponent],
  templateUrl: './room-grid.component.html',
  styleUrl: './room-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomGridComponent {
  readonly sortOptions = SORT_OPTIONS;
  readonly sortBy = signal('newest');

  get rooms(): RoomCard[] {
    switch (this.sortBy()) {
      case 'price-asc': return [...ROOM_LISTINGS].sort((a, b) => a.price - b.price);
      case 'rating':    return [...ROOM_LISTINGS].sort((a, b) => b.rating - a.rating);
      case 'distance':  return [...ROOM_LISTINGS].sort((a, b) => b.reviewCount - a.reviewCount);
      case 'newest':
      default:          return ROOM_LISTINGS;
    }
  }

  readonly total = 2450;
  get visible(): number {
    return this.rooms.length;
  }

  onWishlist(room: RoomCard): void {
    console.log('wishlist', room.id);
  }

  onCardClick(room: RoomCard): void {
    console.log('open', room.id);
  }
}
