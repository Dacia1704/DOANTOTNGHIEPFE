import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, computed, effect, inject, signal } from '@angular/core';
import { Client, StompConfig } from '@stomp/stompjs';
import { Observable, Subject, filter, map, mergeMap, race, take, throwError, timeout } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { ChatConversation, ChatMessage, ChatMessagePage } from '@model/chat/chat.model';
import { ChatMapper } from '@model/chat/chat.mapper';
import { ChatConversationResponse, ChatMessageResponse } from '@model/chat/response/chat-response';
import { AuthService } from '../auth/auth.service';

export const CHAT_STOMP_CLIENT = new InjectionToken<(config: StompConfig) => Client>(
  'CHAT_STOMP_CLIENT',
  {
    providedIn: 'root',
    factory: () => (config) => new Client(config),
  },
);

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly createClient = inject(CHAT_STOMP_CLIENT);
  private readonly api = `${environment.apiUrl}/chat`;
  private readonly consumers = signal(0);
  private readonly requested = computed(() => this.consumers() > 0);
  private readonly incoming = new Subject<ChatMessage>();
  private readonly notificationChanges = new Subject<void>();
  private readonly realtimeReady = new Subject<void>();
  private readonly deliveryErrors = new Subject<{
    conversationId: string | null;
    message: string;
  }>();
  private readonly drafts = new Map<string, string>();
  private readonly conversationDrafts = new Map<string, string>();
  private previousUserId = this.auth.session()?.id;
  private client?: Client;
  readonly messages$ = this.incoming.asObservable();
  readonly notificationChanges$ = this.notificationChanges.asObservable();
  readonly realtimeReady$ = this.realtimeReady.asObservable();
  readonly connection = signal<'connecting' | 'connected' | 'disconnected'>('disconnected');
  readonly realtimeError = signal('');

  constructor() {
    effect((onCleanup) => {
      const token = this.auth.session()?.accessToken;
      const userId = this.auth.session()?.id;
      if (userId !== this.previousUserId) {
        this.drafts.clear();
        this.conversationDrafts.clear();
        this.previousUserId = userId;
      }
      if (!this.requested() || !token) {
        this.connection.set('disconnected');
        this.realtimeError.set('');
        return;
      }
      const url = new URL(environment.wsUrl, window.location.origin);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const client = this.createClient({
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
          client.subscribe('/user/queue/notifications', () => this.notificationChanges.next());
          this.realtimeReady.next();
          client.subscribe('/user/queue/messages', (frame) => {
            try {
              this.incoming.next(ChatMapper.message(JSON.parse(frame.body)));
            } catch {
              this.realtimeError.set(
                'Không đọc được tin nhắn mới. Vui lòng tải lại cuộc trò chuyện.',
              );
            }
          });
          client.subscribe('/user/queue/errors', (frame) => {
            try {
              const error = JSON.parse(frame.body);
              this.deliveryErrors.next({
                conversationId: error.conversationId ?? null,
                message: error.message || 'Không gửi được tin nhắn.',
              });
            } catch {
              this.realtimeError.set(
                'Không đọc được phản hồi gửi tin. Vui lòng tải lại cuộc trò chuyện.',
              );
            }
          });
        },
        onWebSocketClose: () => this.connection.set('disconnected'),
        onStompError: () => {
          this.realtimeError.set(
            'Kết nối trò chuyện gặp lỗi. Vui lòng thử lại hoặc đăng nhập lại.',
          );
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
    this.consumers.update((value) => value + 1);
  }

  stopRealtime(): void {
    this.consumers.update((value) => Math.max(0, value - 1));
  }

  getConversations(): Observable<ChatConversation[]> {
    return this.http
      .get<ApiResponse<ChatConversationResponse[]>>(`${this.api}/conversations`)
      .pipe(map(({ data }) => data.map((dto) => ChatMapper.conversation(dto))));
  }

  openListing(listingId: string): Observable<ChatConversation> {
    return this.http
      .post<ApiResponse<ChatConversationResponse>>(
        `${this.api}/conversations/listing/${encodeURIComponent(listingId)}`,
        {},
      )
      .pipe(map(({ data }) => ChatMapper.conversation(data)));
  }

  openSupport(): Observable<ChatConversation> {
    return this.http
      .post<ApiResponse<ChatConversationResponse>>(`${this.api}/conversations/support`, {})
      .pipe(map(({ data }) => ChatMapper.conversation(data)));
  }

  getMessages(id: string, page = 0): Observable<ChatMessagePage> {
    const params = new HttpParams().set('page', page).set('size', 30);
    return this.http
      .get<ApiResponse<PageResponse<ChatMessageResponse>>>(
        `${this.api}/conversations/${encodeURIComponent(id)}/messages`,
        { params },
      )
      .pipe(
        map(({ data }) => ({
          items: data.data.map((dto) => ChatMapper.message(dto)).reverse(),
          page: data.currentPage,
          totalPages: data.totalPages,
        })),
      );
  }

  markRead(id: string): Observable<unknown> {
    return this.http.put(`${this.api}/conversations/${encodeURIComponent(id)}/read`, {});
  }

  sendText(conversationId: string, content: string): Observable<ChatMessage> {
    const client = this.client;
    const senderId = this.auth.session()?.id;
    if (!client?.connected)
      return throwError(() => new Error('Chưa kết nối trò chuyện. Vui lòng thử lại.'));
    // Keep the draft until the backend echoes a persisted message to the sender's queue.
    return new Observable<ChatMessage>((subscriber) => {
      const ack = race(
        this.messages$.pipe(
          filter(
            (message) =>
              message.conversationId === conversationId &&
              message.sender.id === senderId &&
              message.content === content,
          ),
        ),
        this.deliveryErrors.pipe(
          filter((error) => !error.conversationId || error.conversationId === conversationId),
          mergeMap((error) => throwError(() => new Error(error.message))),
        ),
      )
        .pipe(take(1), timeout(12000))
        .subscribe(subscriber);
      subscriber.add(ack);
      client.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({ conversationId, content, messageType: 'TEXT' }),
      });
      return () => ack.unsubscribe();
    });
  }

  saveConversationDraft(id: string, text: string): void {
    if (text) this.conversationDrafts.set(id, text);
    else this.conversationDrafts.delete(id);
  }

  conversationDraft(id: string): string {
    return this.conversationDrafts.get(id) ?? '';
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
