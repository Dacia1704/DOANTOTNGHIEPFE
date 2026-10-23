import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Room } from '@model/room/room.model';
import { RoomUtils } from '@shared/utils/room-utils';
import { TextUtils } from '@shared/utils/text-utils';
import { ImageUtils } from '@shared/utils/image-utils';

export interface RoomDetailDialogData {
  room: Room;
}

@Component({
  selector: 'app-room-detail-dialog',
  imports: [MatDialogModule],
  templateUrl: './room-detail-dialog.component.html',
  styleUrl: './room-detail-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomDetailDialogComponent {
  readonly data = inject<RoomDetailDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<RoomDetailDialogComponent>);

  readonly roomUtils = RoomUtils;
  readonly textUtils = TextUtils;
  readonly imageUtils = ImageUtils;

  readonly activeImageIndex = signal(0);

  setActiveImage(index: number): void {
    this.activeImageIndex.set(index);
  }
}
