import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { AiService } from '@services/ai/ai.service';
import { AuthService } from '@services/auth/auth.service';
import { AiListingItem } from '@model/ai/ai.model';
import { AiListingCardsComponent } from '@shared/components/ai-listing-cards/ai-listing-cards.component';

@Component({
  selector: 'app-ai-recommendation',
  imports: [AiListingCardsComponent],
  templateUrl: './ai-recommendation.component.html',
  styleUrl: './ai-recommendation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiRecommendationComponent {
  readonly auth = inject(AuthService);
  private readonly ai = inject(AiService);
  private readonly reload = signal(0);
  readonly items = signal<AiListingItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  private requestId = '';

  constructor() {
    effect(onCleanup => {
      this.reload();
      if (!this.auth.hasPermission('ROLE_TENANT')) {
        this.items.set([]);
        return;
      }
      this.items.set([]);
      this.error.set('');
      this.loading.set(true);
      const request = this.ai.getRecommendations(4).subscribe({
        next: result => {
          this.requestId = result.request_id;
          this.items.set(result.items.map(item => ({ ...item, id: item.listing_id })));
          this.loading.set(false);
          result.items.forEach((item, index) => this.ai.sendEvent({
            request_id: result.request_id, listing_id: item.listing_id,
            event_type: 'IMPRESSION', position: index + 1, source: 'HOME',
          }).subscribe({ error: () => {} }));
        },
        error: error => {
          this.loading.set(false);
          this.error.set(error?.error?.detail || 'Chưa tải được gợi ý. Vui lòng thử lại.');
        },
      });
      onCleanup(() => request.unsubscribe());
    });
  }

  retry(): void { this.reload.update(value => value + 1); }

  recordClick(listingId: string): void {
    this.ai.sendEvent({ request_id: this.requestId, listing_id: listingId,
      event_type: 'CLICK', source: 'HOME' }).subscribe({ error: () => {} });
  }
}
