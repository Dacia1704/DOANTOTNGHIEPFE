import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReviewSummary } from '@model/review/listing-review.model';

@Component({
  selector: 'app-listing-rating',
  imports: [DecimalPipe],
  template: `
    @if (compact()) {
      @if (summary(); as rating) {
        <button type="button" class="rating-chip" (click)="viewReviews.emit()">
          <span class="material-symbols-outlined" aria-hidden="true">star</span>
          <strong>{{
            rating.averageRating === null
              ? 'Chưa có đánh giá'
              : (rating.averageRating | number: '1.1-2')
          }}</strong>
          @if (rating.totalReviews) {
            <span>({{ rating.totalReviews }} đánh giá)</span>
          }
        </button>
      }
    } @else {
      <div class="host-rating">
        <div class="host-stats">
          <div>
            <strong
              ><span class="material-symbols-outlined" aria-hidden="true">star</span
              >{{
                summary()?.averageRating === null || !summary()
                  ? '—'
                  : (summary()!.averageRating | number: '1.1-2')
              }}</strong
            ><span>Điểm chủ trọ</span>
          </div>
          <div>
            <strong>{{ summary() ? summary()!.totalReviews : '—' }}</strong
            ><span>Đánh giá</span>
          </div>
          <div>
            <strong>{{
              summary()?.replyRate === null || !summary() ? '—' : summary()!.replyRate + '%'
            }}</strong
            ><span>Phản hồi đánh giá</span>
          </div>
        </div>
        <button type="button" (click)="viewReviews.emit()">
          {{
            summary()?.totalReviews === 0
              ? 'Chưa có đánh giá · Xem chi tiết'
              : 'Xem đánh giá chủ trọ'
          }}<span aria-hidden="true">↗</span>
        </button>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      button {
        font: inherit;
        cursor: pointer;
      }
      .rating-chip {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 16px;
        padding: 8px 12px;
        border: 0;
        border-radius: 999px;
        color: var(--on-surface);
        background: var(--surface-container-low);
        font-size: 14px;
      }
      .rating-chip > .material-symbols-outlined {
        color: var(--secondary);
        font-size: 20px;
        font-variation-settings: 'FILL' 1;
      }
      .rating-chip > span:last-child {
        color: var(--on-surface-variant);
      }
      .host-rating {
        margin: 0 0 12px;
        padding: 14px 0 0;
        border-top: 1px solid var(--border);
      }
      .host-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        text-align: center;
      }
      .host-stats > div {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .host-stats strong {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        color: var(--on-surface);
        font-size: 17px;
      }
      .host-stats .material-symbols-outlined {
        font-size: 17px;
        color: var(--secondary);
        font-variation-settings: 'FILL' 1;
      }
      .host-stats > div > span {
        font-size: 11px;
        line-height: 1.5;
        color: var(--on-surface-variant);
      }
      .host-rating > button {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 12px 0 0;
        border: 0;
        color: var(--primary);
        background: transparent;
        font-size: 13px;
        font-weight: 600;
      }
      button:focus-visible {
        outline: 3px solid var(--primary-focus);
        outline-offset: 3px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingRatingComponent {
  readonly summary = input<ReviewSummary | null>(null);
  readonly compact = input(false);
  readonly viewReviews = output<void>();
}
