import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RoomCardComponent } from '../room-card/room-card.component';
import { AI_RECOMMENDATIONS, RoomCard } from '../../data/landing.mock';

/**
 * Section "Gợi ý phòng thông minh dành cho bạn" — 4 card AI trong grid responsive.
 */
@Component({
  selector: 'app-ai-recommendation',
  imports: [RoomCardComponent],
  templateUrl: './ai-recommendation.component.html',
  styleUrl: './ai-recommendation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiRecommendationComponent {
  readonly rooms: RoomCard[] = AI_RECOMMENDATIONS;

  onWishlist(room: RoomCard): void {
    // Stub: chưa cần gọi service.
    console.log('wishlist', room.id);
  }

  onCardClick(room: RoomCard): void {
    // Stub: điều hướng đến trang chi tiết khi có routing thật.
    console.log('open', room.id);
  }
}
