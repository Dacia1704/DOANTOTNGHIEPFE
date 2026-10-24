export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM';

export interface ChatUser {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  roles: string[];
}

export interface ChatListing {
  id: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: ChatUser;
  content: string;
  messageType: MessageType;
  status?: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: Date;
  /** True nếu message này do current user gửi */
  isMine?: boolean;
}

export interface ChatConversation {
  id: string;
  otherUser: ChatUser;
  /** Alias cho otherUser */
  otherParticipant?: ChatUser;
  listing: ChatListing | null;
  lastMessage: ChatMessage | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}
