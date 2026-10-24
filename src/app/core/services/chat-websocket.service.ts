import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '@environments/environment';
import { AuthService } from './auth.service';
import { ChatMessageResponse } from '@model/chat/response/chat-response';
import { ChatMapper } from '@model/chat/chat.mapper';
import { ChatMessage } from '@model/chat/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatWebSocketService implements OnDestroy {
  private readonly authService = inject(AuthService);

  private client: Client | null = null;
  private subscription: StompSubscription | null = null;

  /** Stream tin nhắn realtime — component subscribe để cập nhật UI */
  readonly message$ = new Subject<ChatMessage>();

  /** Kết nối WebSocket với JWT từ session hiện tại */
  connect(): void {
    if (this.client?.connected) return;

    const token = this.authService.accessToken;
    if (!token) return;

    const currentUserId = this.authService.session()?.id;

    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl || '/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      debug: str => {
        console.debug('[ChatWS]', str);
      },
      onConnect: () => {
        console.log('[ChatWS] Connected successfully to STOMP broker');
        this.subscription = this.client!.subscribe(
          '/user/queue/messages',
          (msg: IMessage) => {
            try {
              const raw: ChatMessageResponse = JSON.parse(msg.body);
              const chatMessage = ChatMapper.toMessage(raw, currentUserId);
              this.message$.next(chatMessage);
            } catch (e) {
              console.error('[ChatWS] parse error', e);
            }
          }
        );
      },
      onStompError: frame => {
        console.error('[ChatWS] STOMP error frame:', frame.headers['message'], frame.body);
      },
      onWebSocketClose: () => {
        console.warn('[ChatWS] WebSocket connection closed');
      },
    });

    this.client.activate();
  }

  /** Gửi tin nhắn qua WebSocket */
  sendMessage(conversationId: string, content: string, messageType: 'TEXT' | 'IMAGE' | 'SYSTEM' = 'TEXT'): void {
    if (!this.client?.connected) {
      console.warn('[ChatWS] Not connected');
      return;
    }
    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ conversationId, content, messageType }),
    });
  }

  /** Subscribe vào topic của cuộc trò chuyện: /topic/conversations/{id} */
  subscribeToConversation(conversationId: string, onMessage: (msg: ChatMessage) => void): StompSubscription | null {
    if (!this.client?.connected) return null;
    const currentUserId = this.authService.session()?.id;
    return this.client.subscribe(`/topic/conversations/${conversationId}`, (msg: IMessage) => {
      try {
        const raw: ChatMessageResponse = JSON.parse(msg.body);
        const chatMessage = ChatMapper.toMessage(raw, currentUserId);
        onMessage(chatMessage);
      } catch (e) {
        console.error('[ChatWS] Topic parse error', e);
      }
    });
  }

  /** Ngắt kết nối */
  disconnect(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.client?.deactivate();
    this.client = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
