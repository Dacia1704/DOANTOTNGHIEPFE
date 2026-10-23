import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Room } from '@model/room/room.model';
import { RoomUtils } from '@shared/utils/room-utils';
import { TextUtils } from '@shared/utils/text-utils';
import { ImageUtils } from '@shared/utils/image-utils';

@Component({
  selector: 'app-room-card',
  imports: [],
  templateUrl: './room-card.component.html',
  styleUrl: './room-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomCardComponent {
  @Input({ required: true }) room!: Room;
  @Input() canManage = true;

  @Output() edit = new EventEmitter<Room>();
  @Output() delete = new EventEmitter<Room>();
  @Output() manageImages = new EventEmitter<Room>();
  @Output() viewDetail = new EventEmitter<Room>();

  readonly roomUtils = RoomUtils;
  readonly textUtils = TextUtils;
  readonly imageUtils = ImageUtils;

  get thumbnailSrc(): string {
    return this.imageUtils.toImageSrc(this.room.thumbnail, 'room-fallback.jpg');
  }

  onEdit(): void {
    this.edit.emit(this.room);
  }

  onDelete(): void {
    this.delete.emit(this.room);
  }

  onManageImages(): void {
    this.manageImages.emit(this.room);
  }

  onView(): void {
    this.viewDetail.emit(this.room);
  }
}
