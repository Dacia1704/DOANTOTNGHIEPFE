import { ChatMapper } from './chat.mapper';
import { ChatMessageResponse } from './response/chat-response';

describe('Chat message dates', () => {
  const message = (createdAt: string | null) =>
    ({
      id: 'm',
      conversationId: 'c',
      sender: { id: 'u', fullName: 'Test', avatarUrl: null, roles: [] },
      content: 'Hello',
      messageType: 'TEXT',
      createdAt,
    }) as ChatMessageResponse;
  it('interprets backend local dates in Vietnam and preserves explicit UTC offsets', () => {
    expect(ChatMapper.message(message('2026-10-29T16:00:00')).createdAt?.toISOString()).toBe(
      '2026-10-29T09:00:00.000Z',
    );
    expect(ChatMapper.message(message('2026-10-29T09:00:00Z')).createdAt?.toISOString()).toBe(
      '2026-10-29T09:00:00.000Z',
    );
  });
  it('never exposes Invalid Date to the template for a legacy realtime null or malformed date', () => {
    expect(ChatMapper.message(message(null)).createdAt).toBeNull();
    expect(ChatMapper.message(message('invalid')).createdAt).toBeNull();
  });
});
