import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ImageUtils } from '@shared/utils/image-utils';
import { TextUtils } from '@shared/utils/text-utils';
import { RoomCard } from '../../data/landing.mock';
import { Room } from '@model/room/room.model';
import { ROOM_STATUS_LABELS } from '@model/room/room.model';

export type RoomCardData = RoomCard | Room;

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
  @Output() apiRoomSelected = new EventEmitter<Room>();

  readonly imageUtils = ImageUtils;
  readonly textUtils = TextUtils;

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN');
  }

  get image(): string { return 'thumbnail' in this.room ? this.room.thumbnail : this.room.image; }
  get imageAlt(): string { return 'imageAlt' in this.room ? this.room.imageAlt : this.room.fullAddress; }
  get title(): string { return 'roomTypeName' in this.room ? `Phòng ${this.room.roomTypeName} · ${this.room.areaM2} m²` : this.room.title; }
  get address(): string { return 'fullAddress' in this.room ? this.room.fullAddress : this.room.address; }
  get categoryLabel(): string { return 'roomTypeName' in this.room ? this.room.roomTypeName : this.room.categoryLabel; }
  get categoryIcon(): string { return 'roomTypeName' in this.room ? 'apartment' : this.room.categoryIcon; }
  get tags(): string[] { return 'amenities' in this.room ? this.room.amenities.map(a => a.name) : this.room.tags; }
  get extraLabel(): string { return 'areaM2' in this.room ? `${this.room.areaM2} m²` : this.room.extraLabel; }
  get priceUnit(): string { return 'areaM2' in this.room ? '/ tháng' : this.room.priceUnit; }
  get isVerified(): boolean { return 'amenities' in this.room ? false : !!this.room.isVerified; }
  get isPriority(): boolean { return 'amenities' in this.room ? false : !!this.room.isPriority; }
  get hasMatchBadge(): boolean { return 'amenities' in this.room ? false : !!this.room.matchBadge; }
  get matchBadge(): string { return 'amenities' in this.room ? '' : this.room.matchBadge || ''; }
  get badgeIcon(): string | undefined { return 'amenities' in this.room ? undefined : this.room.badgeIcon; }
  get badgeLabel(): string | undefined { return 'amenities' in this.room ? undefined : this.room.badgeLabel; }
  get isArea(): boolean { return 'areaM2' in this.room ? true : !!this.room.isArea; }
  get rating(): number { return 'amenities' in this.room ? 0 : this.room.rating; }
  get reviewCount(): number { return 'amenities' in this.room ? 0 : this.room.reviewCount; }
  get distance(): string { return 'amenities' in this.room ? '' : this.room.distance; }
  get hostInitials(): string { return 'amenities' in this.room ? 'CH' : this.room.hostInitials; }
  get hostName(): string { return 'amenities' in this.room ? 'Chủ nhà' : this.room.hostName; }
  get isApiRoom(): boolean { return 'amenities' in this.room; }
  get statusLabel(): string { return 'amenities' in this.room ? ROOM_STATUS_LABELS[this.room.rentalStatus] : ''; }
  get subtitle(): string { return 'fullAddress' in this.room ? this.room.fullAddress : `${this.room.address} • ${this.room.distance}`; }

  onWishlist(event: Event): void {
    event.stopPropagation();
    if (!('amenities' in this.room)) this.wishlistToggle.emit(this.room);
  }

  onClick(): void {
    if ('amenities' in this.room) this.apiRoomSelected.emit(this.room);
    else this.cardClick.emit(this.room);
  }
}
