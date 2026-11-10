import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RENTAL_LABELS, RentalRequest } from '@model/rental/rental.model';
import { RentalService } from '@services/rental/rental.service';
import { PropertyLocationComponent } from '@shared/components/property-location/property-location.component';
import { ImageUtils } from '@shared/utils/image-utils';
import { RoomUtils } from '@shared/utils/room-utils';

@Component({
  selector: 'app-rental-request-detail-dialog',
  imports: [DatePipe, MatDialogModule, RouterLink, PropertyLocationComponent],
  templateUrl: './rental-request-detail-dialog.component.html',
  styleUrl: './rental-request-detail-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalRequestDetailDialogComponent {
  readonly data = inject<{ requestId: string; agreementPath: string }>(MAT_DIALOG_DATA);
  private readonly api = inject(RentalService);
  private readonly destroy = inject(DestroyRef);
  readonly request = signal<RentalRequest | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly labels = RENTAL_LABELS;
  readonly utils = RoomUtils;
  readonly images = ImageUtils;
  readonly imageFailed = signal(false);

  constructor() {
    this.load();
  }
  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.request.set(null);
    this.imageFailed.set(false);
    this.api
      .request(this.data.requestId)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (request) => this.request.set(request),
        error: (err) =>
          this.error.set(
            err.status === 403 || err.status === 404
              ? 'Yêu cầu không tồn tại hoặc bạn không có quyền xem.'
              : err.error?.message || 'Không tải được chi tiết yêu cầu. Vui lòng thử lại.',
          ),
      });
  }
}
