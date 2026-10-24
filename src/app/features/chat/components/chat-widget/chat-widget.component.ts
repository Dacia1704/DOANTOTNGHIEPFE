import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { StompSubscription } from '@stomp/stompjs';
import { ChatService } from '@services/chat.service';
import { ChatWebSocketService } from '@services/chat-websocket.service';
import { AuthService } from '@services/auth.service';
import { ChatConversation, ChatMessage } from '@model/chat/chat.model';
import { ConversationListComponent } from '../conversation-list/conversation-list.component';
import { ChatWindowComponent } from '../chat-window/chat-window.component';

@Component({
  selector: 'app-chat-widget',
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ConversationListComponent,
    ChatWindowComponent,
  ],
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  readonly chatService = inject(ChatService);
  private readonly wsService = inject(ChatWebSocketService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  private topicSub: StompSubscription | null = null;

  isOpen = false;
  conversations: ChatConversation[] = [];
  activeConversation: ChatConversation | null = null;
  messages: ChatMessage[] = [];
  messagesPage = 0;
  messageTotal = 0;
  loadingConversations = true;
  loadingMessages = false;
  loadingSupport = false;

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get currentUserId(): string {
    return this.authService.session()?.id ?? '';
  }

  get totalUnread(): number {
    return this.conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }

  constructor() {
    // Lắng nghe signal mở widget từ service
    effect(() => {
      const open = this.chatService.isWidgetOpen();
      this.isOpen = open;
      const target = this.chatService.activeWidgetConversation();
      if (target) {
        this.selectConversation(target);
        this.chatService.activeWidgetConversation.set(null);
      }
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    if (this.isLoggedIn) {
      this.loadConversations();
      this.wsService.connect();
      // Lắng nghe user queue cho thông báo toàn cục / cập nhật list
      this.wsService.message$
        .pipe(takeUntil(this.destroy$))
        .subscribe(msg => this.onRealtimeMessage(msg));
    }
  }

  ngOnDestroy(): void {
    this.topicSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleWidget(): void {
    this.isOpen = !this.isOpen;
    this.chatService.isWidgetOpen.set(this.isOpen);
    if (this.isOpen && this.conversations.length === 0) {
      this.loadConversations();
    }
    this.cdr.markForCheck();
  }

  closeWidget(): void {
    this.isOpen = false;
    this.chatService.isWidgetOpen.set(false);
    this.cdr.markForCheck();
  }

  backToList(): void {
    this.topicSub?.unsubscribe();
    this.topicSub = null;
    this.activeConversation = null;
    this.messages = [];
    this.cdr.markForCheck();
  }

  loadConversations(): void {
    this.loadingConversations = true;
    this.chatService
      .getMyConversations()
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

    // Subscribe topic của cuộc trò chuyện: /topic/conversations/{id}
    this.topicSub?.unsubscribe();
    this.topicSub = this.wsService.subscribeToConversation(conv.id, msg => {
      this.onRealtimeMessage(msg);
    });

    // Đánh dấu đã đọc
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
    // Nếu đang mở đúng conversation
    if (this.isOpen && this.activeConversation && msg.conversationId === this.activeConversation.id) {
      const exists = this.messages.some(m => m.id === msg.id);
      if (!exists) {
        this.messages = [...this.messages, msg];
      }
      this.chatService.markAsRead(this.activeConversation.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }

    // Cập nhật conversation list
    this.conversations = this.conversations.map(c => {
      if (c.id !== msg.conversationId) return c;
      const isActive = this.isOpen && this.activeConversation?.id === c.id;
      return {
        ...c,
        lastMessage: msg,
        lastMessageAt: msg.createdAt,
        unreadCount: isActive ? 0 : c.unreadCount + (msg.isMine ? 0 : 1),
      };
    });

    this.conversations = [...this.conversations].sort((a, b) => {
      const ta = a.lastMessageAt?.getTime() ?? 0;
      const tb = b.lastMessageAt?.getTime() ?? 0;
      return tb - ta;
    });

    this.cdr.markForCheck();
  }

  /** Mở cuộc trò chuyện hỗ trợ trực tuyến với Admin */
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
