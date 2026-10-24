import {
  ChatConversationResponse,
  ChatMessageResponse,
  ChatUserResponse,
} from './response/chat-response';
import {
  ChatConversation,
  ChatMessage,
  ChatUser,
} from './chat.model';

export class ChatMapper {
  static toUser(r: ChatUserResponse): ChatUser {
    return {
      id: r.id,
      fullName: r.fullName,
      avatarUrl: r.avatarUrl,
      roles: r.roles ?? [],
    };
  }

  static toMessage(r: ChatMessageResponse, currentUserId?: string): ChatMessage {
    return {
      id: r.id,
      conversationId: r.conversationId,
      sender: this.toUser(r.sender),
      content: r.content,
      messageType: r.messageType,
      status: r.status,
      createdAt: new Date(r.createdAt),
      isMine: currentUserId ? r.sender.id === currentUserId : undefined,
    };
  }

  static toConversation(r: ChatConversationResponse): ChatConversation {
    const other = this.toUser(r.otherUser);
    return {
      id: r.id,
      otherUser: other,
      otherParticipant: other,
      listing: r.listing ?? null,
      lastMessage: r.lastMessage ? this.toMessage(r.lastMessage) : null,
      lastMessageAt: r.lastMessageAt ? new Date(r.lastMessageAt) : null,
      unreadCount: r.unreadCount,
    };
  }

  static toConversationList(rs: ChatConversationResponse[]): ChatConversation[] {
    return rs.map(r => this.toConversation(r));
  }

  static toMessageList(rs: ChatMessageResponse[], currentUserId?: string): ChatMessage[] {
    return rs.map(r => this.toMessage(r, currentUserId));
  }
}
