import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { ChatService, CHAT_STOMP_CLIENT } from './chat.service';
import { AuthService } from '../auth/auth.service';
import { AuthSession } from '@model/auth/auth.model';

const transport: { clients: TestClient[] } = { clients: [] };
class TestClient {
  connected = false;
  callbacks = new Map<string, (frame: { body: string }) => void>();
  publish = vi.fn();
  deactivate = vi.fn(async () => {
    this.connected = false;
  });
  constructor(readonly config: any) {
    transport.clients.push(this);
  }
  activate() {
    this.connected = true;
    this.config.beforeConnect();
    this.config.onConnect();
  }
  subscribe(destination: string, callback: (frame: { body: string }) => void) {
    this.callbacks.set(destination, callback);
  }
}

describe('Chat delivery acknowledgements', () => {
  function setup() {
    const session = signal({ id: 'sender', accessToken: 'local-test-token' } as AuthSession | null);
    const auth = {
      session,
      get accessToken() {
        return session()?.accessToken ?? null;
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: AuthService, useValue: auth },
        { provide: CHAT_STOMP_CLIENT, useValue: (config: any) => new TestClient(config) },
      ],
    });
    return { chat: TestBed.inject(ChatService), session };
  }
  function connect(chat: ChatService) {
    chat.startRealtime();
    TestBed.tick();
    return transport.clients[transport.clients.length - 1];
  }
  beforeEach(() => {
    transport.clients.length = 0;
  });
  it('waits for this sender and conversation before acknowledging a send', async () => {
    const { chat } = setup();
    const client = connect(chat);
    const next = vi.fn();
    const subscription = chat.sendText('conversation', 'Hello').subscribe(next);
    expect(next).not.toHaveBeenCalled();
    const message = {
      id: 'persisted',
      conversationId: 'other',
      sender: { id: 'sender' },
      content: 'Hello',
      messageType: 'TEXT',
      createdAt: '2026-10-29T16:00:00',
    };
    client.callbacks.get('/user/queue/messages')!({ body: JSON.stringify(message) });
    expect(next).not.toHaveBeenCalled();
    client.callbacks.get('/user/queue/messages')!({
      body: JSON.stringify({ ...message, conversationId: 'conversation' }),
    });
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0].createdAt.toISOString()).toBe('2026-10-29T09:00:00.000Z');
    expect(subscription.closed).toBe(true);
  });
  it('surfaces a correlated backend rejection immediately instead of waiting for the timeout', async () => {
    const { chat } = setup();
    const client = connect(chat);
    const pending = firstValueFrom(chat.sendText('conversation', 'Hello'));
    const rejection = expect(pending).rejects.toThrow('Bạn không tham gia cuộc trò chuyện này.');
    client.callbacks.get('/user/queue/errors')!({
      body: JSON.stringify({
        conversationId: 'conversation',
        code: 'NOT_CONVERSATION_PARTY',
        message: 'Bạn không tham gia cuộc trò chuyện này.',
      }),
    });
    await rejection;
  });
  it('keeps the socket while another chat view still uses it', () => {
    const { chat } = setup();
    const client = connect(chat);
    chat.startRealtime();
    TestBed.tick();
    chat.stopRealtime();
    TestBed.tick();
    expect(transport.clients).toHaveLength(1);
    expect(client.deactivate).not.toHaveBeenCalled();
    chat.stopRealtime();
    TestBed.tick();
    expect(client.deactivate).toHaveBeenCalledOnce();
  });
  it('preserves drafts for a view reopening but clears them when the account changes', () => {
    const { chat, session } = setup();
    chat.saveConversationDraft('conversation', 'Chưa gửi');
    expect(chat.conversationDraft('conversation')).toBe('Chưa gửi');
    session.set({ id: 'another-user', accessToken: 'another-test-token' } as AuthSession);
    TestBed.tick();
    expect(chat.conversationDraft('conversation')).toBe('');
  });
});
