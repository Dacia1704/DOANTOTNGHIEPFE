import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { ChatPageComponent } from './chat-page.component';
import { ChatService } from '@services/chat/chat.service';
import { AuthService } from '@services/auth/auth.service';
import { ChatConversation, ChatMessage } from '@model/chat/chat.model';
import { RoleCode } from '@model/auth/auth.model';
describe('Conversation selection order', () => {
  function setup(compact = false) {
    const conversations: ChatConversation[] = ['first', 'second', 'third'].map((id, index) => ({
      id,
      otherUser: {
        id: `user-${id}`,
        fullName: `Người dùng ${id}`,
        avatarUrl: null,
        roles: ['TENANT'],
      },
      listing: null,
      lastMessage: null,
      lastMessageAt: new Date(2026, 10, 9, 10 - index),
      unreadCount: 1,
    }));
    const queries = new BehaviorSubject(convertToParamMap({ conversation: 'third' }));
    const incoming = new Subject<ChatMessage>();
    const api = {
      startRealtime: vi.fn(),
      stopRealtime: vi.fn(),
      messages$: incoming,
      connection: signal('connected'),
      realtimeError: signal(''),
      getConversations: vi.fn(() => of(conversations)),
      getMessages: vi.fn(() => of({ items: [], page: 0, totalPages: 0 })),
      markRead: vi.fn(() => of(null)),
      takeDraft: vi.fn(),
      conversationDraft: () => '',
      saveConversationDraft: vi.fn(),
      openSupport: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ChatPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: queries } },
        { provide: ChatService, useValue: api },
        {
          provide: AuthService,
          useValue: {
            primaryRole: () => RoleCode.ADMIN,
            hasAnyRole: () => false,
            session: () => ({ id: 'admin' }),
          },
        },
      ],
    });
    const f = TestBed.createComponent(ChatPageComponent);
    f.componentInstance.compact = compact;
    if (compact) f.componentInstance.target = { conversationId: 'third' };
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation((_commands, extras) => {
      queries.next(convertToParamMap(extras?.queryParams ?? {}));
      return Promise.resolve(true);
    });
    f.detectChanges();
    return { f, api, queries, conversations, incoming };
  }
  for (const compact of [false, true]) {
    it(`keeps the selected user in place and retains the inbox scroll in compact=${compact}`, () => {
      const { f, api, conversations } = setup(compact);
      const list = f.nativeElement.querySelector('.conversation-items') as HTMLElement;
      list.scrollTop = 120;
      expect(f.componentInstance.conversations().map((c) => c.id)).toEqual([
        'first',
        'second',
        'third',
      ]);
      f.componentInstance.selectConversation(conversations[1]);
      f.detectChanges();
      expect(f.componentInstance.selected()?.id).toBe('second');
      expect(f.componentInstance.conversations().map((c) => c.id)).toEqual([
        'first',
        'second',
        'third',
      ]);
      expect(
        [...f.nativeElement.querySelectorAll('.conversation-name')].map(
          (el: any) => el.textContent.match(/Người dùng \w+/)?.[0],
        ),
      ).toEqual(['Người dùng first', 'Người dùng second', 'Người dùng third']);
      expect(list.scrollTop).toBe(120);
      expect(api.getConversations).toHaveBeenCalledTimes(1);
    });
  }
  it('continues updating last message order when a real message arrives', () => {
    const { f, incoming } = setup();
    incoming.next({
      id: 'new-message',
      conversationId: 'third',
      content: 'Tin nhắn mới',
      sender: {
        id: 'user-third',
        fullName: 'Người dùng third',
        roles: ['TENANT'],
        avatarUrl: null,
      },
      createdAt: new Date(2026, 10, 9, 12),
      messageType: 'TEXT',
    });
    expect(f.componentInstance.conversations()[0].id).toBe('third');
    expect(f.componentInstance.conversations()[0].lastMessage?.content).toBe('Tin nhắn mới');
  });
  it('refreshes for a deep link to a newly created conversation and for explicit reloads', () => {
    const { f, api, queries, conversations } = setup();
    const newConversation = { ...conversations[0], id: 'new-thread' };
    api.getConversations.mockReturnValue(of([...conversations, newConversation]));
    queries.next(convertToParamMap({ conversation: 'new-thread' }));
    expect(f.componentInstance.selected()?.id).toBe('new-thread');
    expect(api.getConversations).toHaveBeenCalledTimes(2);
    expect(f.componentInstance.conversations().map((c) => c.id)).toEqual([
      'first',
      'second',
      'third',
      'new-thread',
    ]);
    f.componentInstance.reloadConversations();
    expect(api.getConversations).toHaveBeenCalledTimes(3);
  });
});
