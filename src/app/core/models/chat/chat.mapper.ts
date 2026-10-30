import { ChatConversation, ChatMessage } from './chat.model';
import { ChatConversationResponse, ChatMessageResponse } from './response/chat-response';

export class ChatMapper {
  static message(dto: ChatMessageResponse): ChatMessage {
    return { ...dto, createdAt: this.date(dto.createdAt) };
  }

  static conversation(dto: ChatConversationResponse): ChatConversation {
    return {
      ...dto,
      otherUser: dto.otherUser ?? null,
      listing: dto.listing ?? null,
      lastMessage: dto.lastMessage ? this.message(dto.lastMessage) : null,
      lastMessageAt: dto.lastMessageAt ? this.date(dto.lastMessageAt) : null,
      unreadCount: dto.unreadCount ?? 0,
    };
  }

  private static date(value: string): Date {
    return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}+07:00`);
  }
}
