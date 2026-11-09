import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Review } from '@model/review/review.model';
import { ImageUtils } from '@shared/utils/image-utils';
@Component({
  selector: 'app-review-card',
  imports: [DatePipe],
  templateUrl: './review-card.component.html',
  styleUrl: './review-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewCardComponent {
  readonly review = input.required<Review>();
  readonly moderation = input(false);
  readonly stars = [1, 2, 3, 4, 5];
  readonly images = ImageUtils;
}
