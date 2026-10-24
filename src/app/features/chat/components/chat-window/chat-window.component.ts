import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatConversation, ChatMessage } from '@model/chat/chat.model';

@Component({
  selector: 'app-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class ChatWindowComponent implements OnChanges {
  @Input() conversation!: ChatConversation;
  @Input() messages: ChatMessage[] = [];
  @Input() loading = false;
  @Input() currentUserId = '';
  @Input() hasMore = false;
  @Input() showHeader = true;

  @Output() sendMessage = new EventEmitter<string>();
  @Output() loadMore = new EventEmitter<void>();

  @ViewChild('messagesEnd') messagesEnd!: ElementRef<HTMLElement>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  inputText = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      // Scroll to bottom khi có tin mới
      setTimeout(() => this.scrollToBottom(), 50);
    }
  }

  onSend(): void {
    const text = this.inputText.trim();
    if (!text) return;
    this.sendMessage.emit(text);
    this.inputText = '';
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  scrollToBottom(): void {
    this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  isMine(msg: ChatMessage): boolean {
    return msg.sender.id === this.currentUserId;
  }

  getAvatarFallback(name: string): string {
    return (name ?? '?').charAt(0).toUpperCase();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(date: Date): string {
    const now = new Date();
    const d = new Date(date);
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) return 'Hôm nay';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /** Kiểm tra xem có cần hiển thị ngày separator không */
  showDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const prev = this.messages[index - 1];
    const curr = this.messages[index];
    return (
      new Date(prev.createdAt).toDateString() !==
      new Date(curr.createdAt).toDateString()
    );
  }

  trackById(_: number, msg: ChatMessage): string {
    return msg.id;
  }
}
