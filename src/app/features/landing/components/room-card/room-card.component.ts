import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ImageUtils } from '@shared/utils/image-utils';
import { TextUtils } from '@shared/utils/text-utils';
import { RoomCard } from '../../data/landing.mock';
import { PublicListing } from '@model/public-listing/public-listing.model';
import { ROOM_STATUS_LABELS } from '@model/room/room.model';

export type RoomCardData = RoomCard | PublicListing;

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
  @Input({ required: true }) room!: RoomCardData;

  @Output() wishlistToggle = new EventEmitter<RoomCard>();
  @Output() cardClick = new EventEmitter<RoomCard>();
  @Output() apiRoomSelected = new EventEmitter<PublicListing>();

  readonly imageUtils = ImageUtils;
  readonly textUtils = TextUtils;

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN');
  }

  get pricePrefix(): string {
    return 'listingId' in this.room && this.room.rentalMode === 'BY_ROOM' ? 'Từ ' : '';
  }
  get image(): string {
    return 'thumbnail' in this.room ? this.room.thumbnail : this.room.image;
  }
  get imageAlt(): string {
    return 'imageAlt' in this.room ? this.room.imageAlt : this.room.fullAddress;
  }
  get title(): string {
    return 'listingId' in this.room ? this.room.listingTitle : this.room.title;
  }
  get address(): string {
    return 'fullAddress' in this.room ? this.room.fullAddress : this.room.address;
  }
  get categoryLabel(): string {
    return 'listingId' in this.room ? this.room.categoryLabel : this.room.categoryLabel;
  }
  get categoryIcon(): string {
    return 'listingId' in this.room ? 'apartment' : this.room.categoryIcon;
  }
  get tags(): string[] {
    return 'listingId' in this.room ? this.room.amenities.map((a) => a.name) : this.room.tags;
  }
  get extraLabel(): string {
    return 'listingId' in this.room ? this.room.extraLabel : this.room.extraLabel;
  }
  get priceUnit(): string {
    return 'listingId' in this.room ? '/ tháng' : this.room.priceUnit;
  }
  get isVerified(): boolean {
    return 'listingId' in this.room ? false : !!this.room.isVerified;
  }
  get isPriority(): boolean {
    return 'listingId' in this.room ? this.room.priorityLevel > 0 : !!this.room.isPriority;
  }
  get hasMatchBadge(): boolean {
    return 'listingId' in this.room ? false : !!this.room.matchBadge;
  }
  get matchBadge(): string {
    return 'listingId' in this.room ? '' : this.room.matchBadge || '';
  }
  get badgeIcon(): string | undefined {
    return 'listingId' in this.room ? undefined : this.room.badgeIcon;
  }
  get badgeLabel(): string | undefined {
    return 'listingId' in this.room ? undefined : this.room.badgeLabel;
  }
  get isArea(): boolean {
    return 'listingId' in this.room ? true : !!this.room.isArea;
  }
  get rating(): number {
    return 'listingId' in this.room ? 0 : this.room.rating;
  }
  get reviewCount(): number {
    return 'listingId' in this.room ? 0 : this.room.reviewCount;
  }
  get distance(): string {
    return 'listingId' in this.room ? '' : this.room.distance;
  }
  get hostInitials(): string {
    return 'listingId' in this.room ? 'CH' : this.room.hostInitials;
  }
  get hostName(): string {
    return 'listingId' in this.room ? this.room.landlordName : this.room.hostName;
  }
  get isApiRoom(): boolean {
    return 'listingId' in this.room;
  }
  get statusLabel(): string {
    return 'listingId' in this.room
      ? this.room.rentalMode === 'WHOLE'
        ? this.room.property.availableCount
          ? 'Còn trống'
          : 'Chưa sẵn sàng'
        : `${this.room.property.rooms.length} phòng cho thuê`
      : '';
  }
  get subtitle(): string {
    return 'fullAddress' in this.room
      ? this.room.fullAddress
      : `${this.room.address} • ${this.room.distance}`;
  }

  onWishlist(event: Event): void {
    event.stopPropagation();
    if (!('listingId' in this.room)) this.wishlistToggle.emit(this.room);
  }

  onClick(): void {
    if ('listingId' in this.room) this.apiRoomSelected.emit(this.room);
    else this.cardClick.emit(this.room);
  }
}
