// Chat response DTOs - ánh xạ trực tiếp từ BE

export interface ChatUserResponse {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  roles: string[];
}

export interface ChatListingResponse {
  id: string;
  title: string;
}

export interface ChatMessageResponse {
  id: string;
  conversationId: string;
  sender: ChatUserResponse;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'SYSTEM';
  status?: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
}

export interface ChatConversationResponse {
  id: string;
  otherUser: ChatUserResponse;
  listing: ChatListingResponse | null;
  lastMessage: ChatMessageResponse | null;
  lastMessageAt: string | null;
  unreadCount: number;
}
