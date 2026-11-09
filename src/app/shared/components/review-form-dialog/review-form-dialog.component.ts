import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { Review, ReviewType, REVIEW_LABELS } from '@model/review/review.model';
import { ReviewService } from '@services/review/review.service';
import { ReviewCardComponent } from '../review-card/review-card.component';
export interface ReviewDialogData {
  action: 'create' | 'reply' | 'visibility';
  type: ReviewType;
  agreementId?: string;
  context?: string;
  review?: Review;
}
@Component({
  selector: 'app-review-form-dialog',
  imports: [FormsModule, ReviewCardComponent],
  templateUrl: './review-form-dialog.component.html',
  styleUrl: './review-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewFormDialogComponent {
  readonly data = inject<ReviewDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ReviewFormDialogComponent>);
  private readonly api = inject(ReviewService);
  private readonly destroy = inject(DestroyRef);
  readonly labels = REVIEW_LABELS;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly rating = signal(0);
  readonly stars = [1, 2, 3, 4, 5];
  text = this.data.action === 'reply' ? (this.data.review?.landlordReply ?? '') : '';
  readonly maxLength = this.data.action === 'visibility' ? 500 : 2000;
  get title() {
    if (this.data.action === 'reply') return 'Phản hồi đánh giá';
    if (this.data.action === 'visibility')
      return this.data.review?.hidden ? 'Khôi phục đánh giá' : 'Ẩn đánh giá';
    return `Đánh giá ${this.labels[this.data.type].toLowerCase()}`;
  }
  get valid() {
    return (
      this.text.length <= this.maxLength &&
      (this.data.action === 'create'
        ? Number.isInteger(this.rating()) && this.rating() >= 1 && this.rating() <= 5
        : this.data.action === 'visibility' && this.data.review?.hidden
          ? true
          : !!this.text.trim())
    );
  }
  submit() {
    if (this.busy() || !this.valid) return;
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    const r = this.data.review;
    const request =
      this.data.action === 'create'
        ? this.api.create(this.data.type, {
            rentalAgreementId: this.data.agreementId!,
            rating: this.rating(),
            comment: this.text.trim(),
          })
        : this.data.action === 'reply'
          ? this.api.reply(this.data.type, r!.id, this.text.trim())
          : this.api.visibility(this.data.type, r!.id, {
              hidden: !r!.hidden,
              reason: this.text.trim(),
            });
    request
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: () => this.ref.close({ changed: true }),
        error: (e) =>
          this.error.set(e.error?.message || 'Chưa lưu được thay đổi. Vui lòng thử lại.'),
      });
  }
  close() {
    if (!this.busy()) this.ref.close({ changed: false, refresh: true });
  }
}
