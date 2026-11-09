import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize, Subscription } from 'rxjs';
import { Review } from '@model/review/review.model';
import { ReviewService } from '@services/review/review.service';
import { ReviewCardComponent } from '../review-card/review-card.component';
import { BillingPagerComponent } from '../billing-pager/billing-pager.component';
@Component({
  selector: 'app-tenant-reviews-dialog',
  imports: [ReviewCardComponent, BillingPagerComponent],
  templateUrl: './tenant-reviews-dialog.component.html',
  styleUrl: './tenant-reviews-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantReviewsDialogComponent {
  readonly data = inject<{ id: string; name: string }>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<TenantReviewsDialogComponent>);
  readonly items = signal<Review[]>([]);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  private readonly api = inject(ReviewService);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  constructor() {
    this.load();
  }
  load(page = 0) {
    this.request?.unsubscribe();
    this.page.set(page);
    this.loading.set(true);
    this.error.set('');
    this.items.set([]);
    this.request = this.api
      .tenant(this.data.id, page)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (r) => {
          this.items.set(r.data);
          this.totalPages.set(r.totalPages);
        },
        error: (e) => this.error.set(e.error?.message || 'Chưa tải được đánh giá.'),
      });
  }
}
