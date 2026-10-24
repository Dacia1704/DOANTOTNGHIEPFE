export interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'SYSTEM';
}
