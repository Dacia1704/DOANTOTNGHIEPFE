import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NavigationStart, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PublicListingService } from '@services/listing/public-listing.service';
import { PublicListing } from '@model/public-listing/public-listing.model';
import { TextUtils } from '@shared/utils/text-utils';

@Component({
  selector: 'app-attached-listing-preview',
  imports: [DatePipe, RouterLink],
  templateUrl: './attached-listing-preview.component.html',
  styleUrl: './attached-listing-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachedListingPreviewComponent implements OnInit {
  readonly data = inject<{ listingId: string; title: string }>(DIALOG_DATA);
  readonly dialogRef = inject(DialogRef);
  readonly listing = signal<PublicListing | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly unavailable = signal(false);
  readonly imageFailed = signal(false);
  readonly text = TextUtils;
  private readonly api = inject(PublicListingService);
  private readonly destroy = inject(DestroyRef);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.load();
    this.router.events.pipe(takeUntilDestroyed(this.destroy)).subscribe((event) => {
      if (event instanceof NavigationStart) this.dialogRef.close();
    });
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.unavailable.set(false);
    this.api
      .getById(this.data.listingId)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (listing) => this.listing.set(listing),
        error: (error) => {
          this.unavailable.set(error.status === 404 || error.status === 410);
          this.error.set(
            this.unavailable()
              ? 'Tin đăng đã ẩn, hết hạn hoặc không còn khả dụng.'
              : 'Không thể tải tin đăng. Vui lòng thử lại.',
          );
        },
      });
  }
}
