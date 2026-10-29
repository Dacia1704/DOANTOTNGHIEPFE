export interface ChatUser {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  roles: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: ChatUser;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'SYSTEM';
  createdAt: Date;
}

export interface ChatConversation {
  id: string;
  otherUser: ChatUser | null;
  listing: { id: string; title: string } | null;
  lastMessage: ChatMessage | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}

export interface ChatMessagePage {
  items: ChatMessage[];
  page: number;
  totalPages: number;
}
