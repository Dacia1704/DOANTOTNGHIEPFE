import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PublicListing } from '@model/public-listing/public-listing.model';
import { Room } from '@model/room/room.model';
import { PropertyRoomsComponent } from '../../../property/components/property-rooms/property-rooms.component';
import { RoomDetailDialogComponent } from '../../../room/components/room-detail-dialog/room-detail-dialog.component';
import { ImageUtils } from '@shared/utils/image-utils';
@Component({
  selector: 'app-public-listing-detail',
  imports: [MatDialogModule, PropertyRoomsComponent],
  templateUrl: './public-listing-detail.component.html',
  styleUrl: './public-listing-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicListingDetailComponent {
  readonly listing = inject<PublicListing>(MAT_DIALOG_DATA);
  private readonly dialogs = inject(MatDialog);
  readonly images = ImageUtils;
  openRoom(room: Room): void {
    this.dialogs.open(RoomDetailDialogComponent, {
      data: { room },
      width: '740px',
      maxWidth: '96vw',
      maxHeight: '92dvh',
    });
  }
}
