import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PublicListing } from '@model/public-listing/public-listing.model';
import { Room, RoomRentalStatus } from '@model/room/room.model';
import { AuthService } from '@services/auth.service';
import { ChatService } from '@services/chat.service';
import { RoomUtils } from '@shared/utils/room-utils';

@Component({
  selector: 'app-booking-dialog',
  imports: [MatDialogModule, ReactiveFormsModule],
  templateUrl: './booking-dialog.component.html',
  styleUrl: './booking-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDialogComponent {
  readonly data = inject<{ listing: PublicListing; room: Room }>(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialogRef<BookingDialogComponent>);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly chat = inject(ChatService);
  readonly utils = RoomUtils;
  readonly rooms = this.data.listing.property.rooms.filter((room) => room.rentalStatus === RoomRentalStatus.AVAILABLE);
  get today(): string { return formatDate(new Date(), 'yyyy-MM-dd', 'en-US', '+0700'); }
  readonly form = this.fb.nonNullable.group({
    roomId: [this.data.room.id, Validators.required],
    moveInDate: ['', [Validators.required, (control) => control.value && control.value < this.today ? { pastDate: true } : null]],
    message: ['', Validators.maxLength(1500)],
  });
  get selectedRoom(): Room | undefined { return this.rooms.find((room) => room.id === this.form.controls.roomId.value); }

  continueToChat(): void {
    if (this.form.invalid || !this.selectedRoom) { this.form.markAllAsTouched(); return; }
    const { moveInDate, message } = this.form.getRawValue();
    const room = this.selectedRoom;
    const date = moveInDate.split('-').reverse().join('/');
    const text = `Chào anh/chị, tôi muốn trao đổi đặt ${this.data.listing.rentalMode === 'WHOLE' ? 'căn nhà' : 'phòng ' + room.roomNumber} tại ${this.data.listing.propertyName}.\nGiá thuê: ${RoomUtils.formatPrice(room.price)}.\nNgày dự kiến vào ở: ${date}.${message.trim() ? '\n' + message.trim() : ''}`;
    this.chat.prepareDraft(this.data.listing.id, text);
    const target = this.router.createUrlTree(['/tin-nhan'], { queryParams: { listing: this.data.listing.id } });
    this.dialog.close();
    if (this.auth.isLoggedIn()) void this.router.navigateByUrl(target);
    else void this.router.navigate(['/login'], { queryParams: { redirect: this.router.serializeUrl(target) } });
  }
}
