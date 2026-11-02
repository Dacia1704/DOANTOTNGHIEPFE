import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AiService, AiChatEvent } from '@services/ai/ai.service';
import { AuthService } from '@services/auth/auth.service';
import { AiListingItem } from '@model/ai/ai.model';
import { AiListingCardsComponent } from '../ai-listing-cards/ai-listing-cards.component';

interface ChatEntry {
  key: number;
  question: string;
  reply: string;
  listings: AiListingItem[];
  requestId?: string;
  messageId?: string | null;
  status: 'pending' | 'complete' | 'failed';
  error?: string;
  rating?: 'UP' | 'DOWN';
}

@Component({
  selector: 'app-ai-chat',
  imports: [FormsModule, AiListingCardsComponent],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiChatComponent {
  readonly auth = inject(AuthService);
  private readonly ai = inject(AiService);
  private readonly destroy = inject(DestroyRef);
  readonly opened = signal(false);
  readonly busy = signal(false);
  readonly entries = signal<ChatEntry[]>([]);
  draft = '';
  private conversationId: string | null = null;
  private request?: Subscription;
  private sequence = 0;
  private ownerId?: string;

  constructor() {
    this.destroy.onDestroy(() => this.request?.unsubscribe());
    effect(() => {
      const owner = this.auth.session()?.id;
      if (owner !== this.ownerId) {
        this.ownerId = owner;
        this.request?.unsubscribe();
        this.entries.set([]);
        this.busy.set(false);
        this.conversationId = null;
        this.opened.set(false);
      }
    });
  }

  send(question = this.draft.trim()): void {
    if (!question || question.length > 2000 || this.busy()) return;
    this.draft = '';
    const key = ++this.sequence;
    this.entries.update(rows => [...rows, { key, question, reply: '', listings: [], status: 'pending' }]);
    this.busy.set(true);
    this.request = this.ai.streamChat(question, this.conversationId).subscribe({
      next: event => this.receive(key, event),
      error: error => {
        this.patch(key, { status: 'failed', error: error?.message || 'Không kết nối được trợ lý.' });
        this.busy.set(false);
      },
      complete: () => this.busy.set(false),
    });
  }

  private receive(key: number, event: AiChatEvent): void {
    switch (event.type) {
      case 'meta':
        this.conversationId = event.data.conversation_id;
        this.patch(key, { requestId: event.data.request_id });
        break;
      case 'token':
        this.entries.update(rows => rows.map(row => row.key === key ? { ...row, reply: row.reply + event.data.text } : row));
        break;
      case 'listings': this.patch(key, { listings: event.data.items }); break;
      case 'retry':
        this.patch(key, { status: 'failed', error: 'Câu trả lời bị gián đoạn. Bạn có thể gửi lại câu hỏi.' });
        break;
      case 'done':
        this.patch(key, { messageId: event.data.message_id, status: event.data.status === 'FAILED' ? 'failed' : 'complete',
          ...(event.data.status === 'FAILED' ? { error: 'Chưa hoàn tất câu trả lời. Vui lòng thử lại.' } : {}) });
        break;
    }
  }

  private patch(key: number, value: Partial<ChatEntry>): void {
    this.entries.update(rows => rows.map(row => row.key === key ? { ...row, ...value } : row));
  }

  stop(): void {
    this.request?.unsubscribe();
    this.busy.set(false);
    this.entries.update(rows => rows.map(row => row.status === 'pending' ? {
      ...row, status: 'failed', error: 'Bạn đã dừng câu trả lời.',
    } : row));
  }

  close(): void { this.stop(); this.opened.set(false); }
  reset(): void { this.stop(); this.conversationId = null; this.entries.set([]); }

  feedback(entry: ChatEntry, rating: 'UP' | 'DOWN'): void {
    if (!entry.messageId) return;
    this.ai.sendFeedback({ message_id: entry.messageId, rating }).subscribe({
      next: () => this.patch(entry.key, { rating }),
      error: () => this.patch(entry.key, { error: 'Chưa gửi được đánh giá. Bạn có thể thử lại.' }),
    });
  }

  clicked(entry: ChatEntry, listingId: string): void {
    if (!entry.requestId || !entry.messageId) return;
    this.ai.sendEvent({ request_id: entry.requestId, listing_id: listingId,
      event_type: 'CLICK', source: 'CHATBOT' }).subscribe({ error: () => {} });
  }
}
