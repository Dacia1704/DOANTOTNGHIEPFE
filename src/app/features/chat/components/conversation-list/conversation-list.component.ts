import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatConversation } from '@model/chat/chat.model';

@Component({
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class ConversationListComponent {
  @Input() conversations: ChatConversation[] = [];
  @Input() activeId: string | null = null;
  @Input() loading = false;

  @Output() selectConversation = new EventEmitter<ChatConversation>();

  trackById(_: number, c: ChatConversation): string {
    return c.id;
  }

  getAvatarFallback(name: string): string {
    return (name ?? '?').charAt(0).toUpperCase();
  }

  formatTime(date: Date | null): string {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
}
