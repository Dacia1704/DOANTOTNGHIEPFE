import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { StompSubscription } from '@stomp/stompjs';
import { ChatService } from '@services/chat.service';
import { ChatWebSocketService } from '@services/chat-websocket.service';
import { AuthService } from '@services/auth.service';
import { ChatConversation, ChatMessage } from '@model/chat/chat.model';
import { ConversationListComponent } from '../../components/conversation-list/conversation-list.component';
import { ChatWindowComponent } from '../../components/chat-window/chat-window.component';

@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ConversationListComponent, ChatWindowComponent],
})
export class ChatPageComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly wsService = inject(ChatWebSocketService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  private topicSub: StompSubscription | null = null;

  conversations: ChatConversation[] = [];
  activeConversation: ChatConversation | null = null;
  messages: ChatMessage[] = [];
  messagesPage = 0;
  messageTotal = 0;
  loadingConversations = true;
  loadingMessages = false;
  loadingSupport = false;

  get currentUserId(): string {
    return this.authService.session()?.id ?? '';
  }

  ngOnInit(): void {
    this.loadConversations();
    this.wsService.connect();
    this.wsService.message$
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => this.onRealtimeMessage(msg));
  }

  ngOnDestroy(): void {
    this.topicSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
    this.wsService.disconnect();
  }

  loadConversations(): void {
    this.loadingConversations = true;
    this.chatService.getMyConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: convs => {
          this.conversations = convs;
          this.loadingConversations = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingConversations = false;
          this.cdr.markForCheck();
        },
      });
  }

  selectConversation(conv: ChatConversation): void {
    this.activeConversation = conv;
    this.messages = [];
    this.messagesPage = 0;
    this.loadMessages(conv.id, 0);

    // Subscribe topic riêng /topic/conversations/{conversationId}
    this.topicSub?.unsubscribe();
    this.topicSub = this.wsService.subscribeToConversation(conv.id, msg => {
      this.onRealtimeMessage(msg);
    });

    // Mark as read
    if (conv.unreadCount > 0) {
      this.chatService.markAsRead(conv.id).pipe(takeUntil(this.destroy$)).subscribe(() => {
        conv.unreadCount = 0;
        this.cdr.markForCheck();
      });
    }
  }

  loadMessages(conversationId: string, page: number): void {
    this.loadingMessages = true;
    this.chatService
      .getMessages(conversationId, page, 20, this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ messages, totalElements }) => {
          const ordered = [...messages].reverse();
          this.messages = page === 0 ? ordered : [...ordered, ...this.messages];
          this.messageTotal = totalElements;
          this.messagesPage = page;
          this.loadingMessages = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingMessages = false;
          this.cdr.markForCheck();
        },
      });
  }

  loadMoreMessages(): void {
    if (!this.activeConversation) return;
    this.loadMessages(this.activeConversation.id, this.messagesPage + 1);
  }

  sendMessage(content: string): void {
    if (!this.activeConversation || !content.trim()) return;
    this.wsService.sendMessage(this.activeConversation.id, content.trim());
  }

  onRealtimeMessage(msg: ChatMessage): void {
    // Nếu đang xem conversation này → thêm message vào cuối
    if (this.activeConversation && msg.conversationId === this.activeConversation.id) {
      const exists = this.messages.some(m => m.id === msg.id);
      if (!exists) {
        this.messages = [...this.messages, msg];
      }
      this.chatService.markAsRead(this.activeConversation.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
    // Cập nhật lastMessage và unreadCount trong conversation list
    this.conversations = this.conversations.map(c => {
      if (c.id !== msg.conversationId) return c;
      const isActive = this.activeConversation?.id === c.id;
      return {
        ...c,
        lastMessage: msg,
        lastMessageAt: msg.createdAt,
        unreadCount: isActive ? 0 : c.unreadCount + (msg.isMine ? 0 : 1),
      };
    });
    // Sort lại
    this.conversations = [...this.conversations].sort((a, b) => {
      const ta = a.lastMessageAt?.getTime() ?? 0;
      const tb = b.lastMessageAt?.getTime() ?? 0;
      return tb - ta;
    });
    this.cdr.markForCheck();
  }

  contactSupport(): void {
    this.loadingSupport = true;
    this.chatService
      .getOrCreateSupportConversation()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: conv => {
          this.loadingSupport = false;
          const exists = this.conversations.find(c => c.id === conv.id);
          if (!exists) this.conversations = [conv, ...this.conversations];
          this.selectConversation(conv);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingSupport = false;
          this.cdr.markForCheck();
        },
      });
  }
}
