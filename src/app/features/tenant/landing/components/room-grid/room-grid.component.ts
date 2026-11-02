import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoomCardComponent, RoomCardData } from '../room-card/room-card.component';
import { PublicListing, PublicListingList } from '@model/public-listing/public-listing.model';

/** Displays paginated published posts returned by the public Listing API. */
@Component({
  selector: 'app-room-grid',
  imports: [FormsModule, RoomCardComponent],
  templateUrl: './room-grid.component.html',
  styleUrl: './room-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomGridComponent {
  @Input() result: PublicListingList | null = null;
  @Input() loading = false;
  @Output() loadMore = new EventEmitter<void>();
  @Output() roomSelected = new EventEmitter<PublicListing>();
  readonly sortOptions = [
    { value: 'newest', label: 'Ưu tiên & mới nhất' },
    { value: 'price-asc', label: 'Giá thấp đến cao' },
  ];
  readonly sortBy = signal('newest');

  get rooms(): PublicListing[] {
    const rooms = [...(this.result?.items ?? [])];
    if (this.sortBy() === 'price-asc') return rooms.sort((a, b) => a.price - b.price);
    return rooms;
  }

  get total(): number {
    return this.result?.total ?? 0;
  }
  get visible(): number {
    return this.rooms.length;
  }

  onWishlist(room: RoomCardData): void {
    console.log('wishlist', room.id);
  }

  onCardClick(room: RoomCardData): void {
    if ('amenities' in room) this.roomSelected.emit(room);
  }

  get canLoadMore(): boolean {
    return !!this.result && this.result.page + 1 < this.result.totalPages;
  }
}
