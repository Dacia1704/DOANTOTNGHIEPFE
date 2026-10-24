import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import {
  ChatConversationResponse,
  ChatMessageResponse,
  ChatUserResponse,
} from '@model/chat/response/chat-response';
import { ChatConversation, ChatMessage, ChatUser } from '@model/chat/chat.model';
import { ChatMapper } from '@model/chat/chat.mapper';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/chat`;

  /** Trạng thái mở/đóng của Chat Widget */
  readonly isWidgetOpen = signal<boolean>(false);
  /** Conversation đang được yêu cầu mở trực tiếp (nếu có) */
  readonly activeWidgetConversation = signal<ChatConversation | null>(null);

  openWidget(conv?: ChatConversation): void {
    if (conv) this.activeWidgetConversation.set(conv);
    this.isWidgetOpen.set(true);
  }

  closeWidget(): void {
    this.isWidgetOpen.set(false);
  }

  toggleWidget(): void {
    this.isWidgetOpen.update((v: boolean) => !v);
  }

  /** Tạo hoặc lấy conversation từ listing (Tenant → Landlord) */
  getOrCreateListingConversation(listingId: string): Observable<ChatConversation> {
    return this.http
      .post<ApiResponse<ChatConversationResponse>>(
        `${this.api}/conversations/listing/${listingId}`,
        {}
      )
      .pipe(map(res => ChatMapper.toConversation(res.data)));
  }

  /** Tạo hoặc lấy conversation hỗ trợ trực tuyến với Admin */
  getOrCreateSupportConversation(): Observable<ChatConversation> {
    return this.http
      .post<ApiResponse<ChatConversationResponse>>(
        `${this.api}/conversations/support`,
        {}
      )
      .pipe(map(res => ChatMapper.toConversation(res.data)));
  }

  /** Lấy danh sách conversations của current user */
  getMyConversations(): Observable<ChatConversation[]> {
    return this.http
      .get<ApiResponse<ChatConversationResponse[]>>(`${this.api}/conversations`)
      .pipe(map(res => ChatMapper.toConversationList(res.data)));
  }

  /** Lấy chi tiết conversation */
  getConversation(conversationId: string): Observable<ChatConversation> {
    return this.http
      .get<ApiResponse<ChatConversationResponse>>(
        `${this.api}/conversations/${conversationId}`
      )
      .pipe(map(res => ChatMapper.toConversation(res.data)));
  }

  /** Lấy lịch sử tin nhắn (phân trang) */
  getMessages(
    conversationId: string,
    page = 0,
    size = 20,
    currentUserId?: string
  ): Observable<{ messages: ChatMessage[]; totalPages: number; totalElements: number }> {
    const params = { page, size };
    return this.http
      .get<ApiResponse<PageResponse<ChatMessageResponse>>>(
        `${this.api}/conversations/${conversationId}/messages`,
        { params }
      )
      .pipe(
        map(res => ({
          messages: ChatMapper.toMessageList(res.data.data, currentUserId),
          totalPages: res.data.totalPages,
          totalElements: res.data.totalElements,
        }))
      );
  }

  /** Đánh dấu đã đọc */
  markAsRead(conversationId: string): Observable<void> {
    return this.http
      .put<ApiResponse<void>>(`${this.api}/conversations/${conversationId}/read`, {})
      .pipe(map(() => void 0));
  }
}
