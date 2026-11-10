import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PublicListing } from '@model/public-listing/public-listing.model';
import { Room } from '@model/room/room.model';
import { rentalEndDate } from '@model/rental/rental.model';
import { AuthService } from '@services/auth/auth.service';
import { RentalService } from '@services/rental/rental.service';
import { ImageUtils } from '@shared/utils/image-utils';
import { RoomUtils } from '@shared/utils/room-utils';

@Component({
  selector: 'app-booking-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './booking-dialog.component.html',
  styleUrl: './booking-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDialogComponent {
  @Input() data = inject<{ listing: PublicListing; room: Room }>(MAT_DIALOG_DATA, {
    optional: true,
  })!;
  private readonly dialog = inject(MatDialogRef<BookingDialogComponent>, { optional: true });
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly api = inject(RentalService);
  private readonly router = inject(Router);
  private readonly toast = inject(MatSnackBar);
  private readonly destroy = inject(DestroyRef);
  readonly utils = RoomUtils;
  readonly images = ImageUtils;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly unavailable = signal(false);
  get today() {
    return formatDate(new Date(), 'yyyy-MM-dd', 'en-US', '+0700');
  }
  readonly form = this.fb.nonNullable.group({
    tenantFullName: [
      this.auth.session()?.fullName ?? '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(/\S/),
      ],
    ],
    tenantPhone: [
      this.auth.session()?.phone ?? '',
      [Validators.required, Validators.pattern(/^\+?[0-9]{9,15}$/)],
    ],
    tenantEmail: [
      this.auth.session()?.email ?? '',
      [Validators.required, Validators.email, Validators.maxLength(255)],
    ],
    tenantCitizenId: ['', [Validators.required, Validators.pattern(/^([0-9]{9}|[0-9]{12})$/)]],
    tenantPermanentAddress: [
      '',
      [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(500),
        Validators.pattern(/\S/),
      ],
    ],
    proposedMoveInDate: [
      '',
      [Validators.required, (c) => (c.value && c.value < this.today ? { pastDate: true } : null)],
    ],
    durationMonths: [
      12,
      [Validators.required, Validators.min(1), Validators.max(36), Validators.pattern(/^\d+$/)],
    ],
    occupantCount: [
      1,
      [
        Validators.required,
        Validators.min(1),
        (c) => (this.data && c.value > this.data.room.maxOccupants ? { max: true } : null),
        Validators.pattern(/^\d+$/),
      ],
    ],
    message: ['', Validators.maxLength(2000)],
    acceptedPrivacyNotice: [false, Validators.requiredTrue],
  });
  get endDate() {
    return rentalEndDate(
      this.form.controls.proposedMoveInDate.value,
      Number(this.form.controls.durationMonths.value),
    );
  }
  submit(): void {
    if (this.busy() || this.unavailable()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    if (this.dialog) this.dialog.disableClose = true;
    this.api
      .create({
        ...this.form.getRawValue(),
        listingId: this.data.listing.id,
        roomId: this.data.room.id,
      })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          this.busy.set(false);
          if (this.dialog) this.dialog.disableClose = false;
        }),
      )
      .subscribe({
        next: () => {
          this.dialog?.close('created');
          this.toast.open('Đã gửi yêu cầu thuê phòng', 'Đóng', { duration: 4000 });
          void this.router.navigateByUrl('/yeu-cau-thue');
        },
        error: (e) => {
          if (e.status === 409 && e.error?.errorCode === 'ROOM_UNAVAILABLE') {
            this.unavailable.set(true);
            this.error.set('Phòng vừa được người khác giữ/thuê. Vui lòng chọn phòng khác.');
          } else if (e.status === 401) {
            this.dialog?.close();
            void this.router.navigate(['/login'], {
              queryParams: { redirect: `/tro/${this.data.listing.id}` },
            });
          } else this.error.set(e.error?.message || 'Không gửi được yêu cầu. Bạn có thể thử lại.');
        },
      });
  }
}
