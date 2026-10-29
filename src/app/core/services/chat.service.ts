import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Observable, Subject, filter, map, take, throwError, timeout } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { ChatConversation, ChatMessage, ChatMessagePage } from '@model/chat/chat.model';
import { ChatMapper } from '@model/chat/chat.mapper';
import { ChatConversationResponse, ChatMessageResponse } from '@model/chat/response/chat-response';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.apiUrl}/chat`;
  private readonly requested = signal(false);
  private readonly incoming = new Subject<ChatMessage>();
  private readonly drafts = new Map<string, string>();
  private client?: Client;
  readonly messages$ = this.incoming.asObservable();
  readonly connection = signal<'connecting' | 'connected' | 'disconnected'>('disconnected');
  readonly realtimeError = signal('');

  constructor() {
    effect((onCleanup) => {
      const token = this.auth.session()?.accessToken;
      if (!this.requested() || !token) {
        this.connection.set('disconnected');
        return;
      }
      const url = new URL(environment.wsUrl, window.location.origin);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const client = new Client({
        brokerURL: url.href,
        reconnectDelay: 5000,
        connectionTimeout: 10000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        beforeConnect: () => {
          client.connectHeaders = { Authorization: `Bearer ${this.auth.accessToken}` };
          this.connection.set('connecting');
        },
        onConnect: () => {
          this.realtimeError.set('');
          this.connection.set('connected');
          client.subscribe('/user/queue/messages', (frame) => {
            try {
              this.incoming.next(ChatMapper.message(JSON.parse(frame.body)));
            } catch {
              this.realtimeError.set('Không đọc được tin nhắn mới. Vui lòng tải lại cuộc trò chuyện.');
            }
          });
        },
        onWebSocketClose: () => this.connection.set('disconnected'),
        onStompError: () => {
          this.realtimeError.set('Kết nối trò chuyện gặp lỗi. Vui lòng thử lại hoặc đăng nhập lại.');
        },
      });
      this.client = client;
      client.activate();
      onCleanup(() => {
        this.client = undefined;
        void client.deactivate();
      });
    });
  }

  startRealtime(): void {
    this.requested.set(true);
  }

  stopRealtime(): void {
    this.requested.set(false);
  }

  getConversations(): Observable<ChatConversation[]> {
    return this.http.get<ApiResponse<ChatConversationResponse[]>>(`${this.api}/conversations`)
      .pipe(map(({ data }) => data.map((dto) => ChatMapper.conversation(dto))));
  }

  openListing(listingId: string): Observable<ChatConversation> {
    return this.http.post<ApiResponse<ChatConversationResponse>>(
      `${this.api}/conversations/listing/${encodeURIComponent(listingId)}`, {},
    ).pipe(map(({ data }) => ChatMapper.conversation(data)));
  }

  openSupport(): Observable<ChatConversation> {
    return this.http.post<ApiResponse<ChatConversationResponse>>(`${this.api}/conversations/support`, {})
      .pipe(map(({ data }) => ChatMapper.conversation(data)));
  }

  getMessages(id: string, page = 0): Observable<ChatMessagePage> {
    const params = new HttpParams().set('page', page).set('size', 30);
    return this.http.get<ApiResponse<PageResponse<ChatMessageResponse>>>(
      `${this.api}/conversations/${encodeURIComponent(id)}/messages`, { params },
    ).pipe(map(({ data }) => ({
      items: data.data.map((dto) => ChatMapper.message(dto)).reverse(),
      page: data.currentPage,
      totalPages: data.totalPages,
    })));
  }

  markRead(id: string): Observable<unknown> {
    return this.http.put(`${this.api}/conversations/${encodeURIComponent(id)}/read`, {});
  }

  sendText(conversationId: string, content: string): Observable<ChatMessage> {
    const client = this.client;
    const senderId = this.auth.session()?.id;
    if (!client?.connected) return throwError(() => new Error('Chưa kết nối trò chuyện. Vui lòng thử lại.'));
    // Keep the draft until the backend echoes a persisted message to the sender's queue.
    return new Observable<ChatMessage>((subscriber) => {
      const ack = this.messages$.pipe(
        filter((message) => message.conversationId === conversationId
          && message.sender.id === senderId && message.content === content),
        take(1), timeout(12000),
      ).subscribe(subscriber);
      client.publish({ destination: '/app/chat.send', body: JSON.stringify({ conversationId, content, messageType: 'TEXT' }) });
      return () => ack.unsubscribe();
    });
  }

  prepareDraft(listingId: string, text: string): void {
    this.drafts.set(listingId, text);
  }

  takeDraft(listingId: string): string | undefined {
    const value = this.drafts.get(listingId);
    this.drafts.delete(listingId);
    return value;
  }
}
