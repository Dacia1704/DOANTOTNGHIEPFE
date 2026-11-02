import { ChatUser } from '../chat.model';

export interface ChatMessageResponse {
  id: string;
  conversationId: string;
  sender: ChatUser;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'SYSTEM';
  createdAt: string | null;
}

export interface ChatConversationResponse {
  id: string;
  otherUser: ChatUser | null;
  listing: { id: string; title: string } | null;
  lastMessage: ChatMessageResponse | null;
  lastMessageAt: string | null;
  unreadCount: number;
}
