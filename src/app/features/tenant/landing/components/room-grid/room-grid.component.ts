import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RoomCardComponent, RoomCardData } from '../room-card/room-card.component';
import { PublicListing, PublicListingList } from '@model/public-listing/public-listing.model';
import { FeedImpressionDirective } from '@shared/directives/feed-impression.directive';
import { RouterLink } from '@angular/router';
import { RoomQueryParams } from '@model/room/request/room-query-params';

/** Displays paginated published posts returned by the public Listing API. */
@Component({
  selector: 'app-room-grid',
  imports: [RoomCardComponent, FeedImpressionDirective, RouterLink],
  templateUrl: './room-grid.component.html',
  styleUrl: './room-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomGridComponent {
  @Input() result: PublicListingList | null = null;
  @Input() loading = false;
  @Input() searchQuery: RoomQueryParams = {};
  get searchParams() {
    return { ...this.searchQuery, page: null, size: null, rankingSession: null };
  }
  @Output() loadMore = new EventEmitter<void>();
  @Output() roomSelected = new EventEmitter<PublicListing>();
  get rooms(): PublicListing[] {
    return this.result?.items ?? [];
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
    return !!this.result && this.visible < 20 && this.result.page + 1 < this.result.totalPages;
  }
}
