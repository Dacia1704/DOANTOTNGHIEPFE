import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { ChatWidgetComponent } from './chat-widget.component';
import { ChatWidgetService } from '@services/chat/chat-widget.service';
import { ChatService } from '@services/chat/chat.service';
import { AuthService } from '@services/auth/auth.service';
import { RoleCode } from '@model/auth/auth.model';
import { ChatConversation, ChatMessage } from '@model/chat/chat.model';

describe('The two chat entry flows', () => {
  function setup(role: RoleCode) {
    const session = signal({ id: 'current', roles: [role], fullName: 'Current user' });
    const auth = {
      session,
      isLoggedIn: () => true,
      hasAnyRole: (roles: RoleCode[]) => roles.includes(role),
    };
    const ownerChat: ChatConversation = {
      id: 'listing-conversation',
      listing: { id: 'selected-post', title: 'Selected listing' },
      otherUser: {
        id: 'actual-property-owner',
        fullName: 'Property owner',
        avatarUrl: null,
        roles: ['LANDLORD'],
      },
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
    };
    const supportChat: ChatConversation = {
      id: 'support-conversation',
      listing: null,
      otherUser: {
        id: 'fixed-admin',
        fullName: 'Internal seeded admin account name',
        avatarUrl: null,
        roles: ['ADMIN'],
      },
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
    };
    const api = {
      startRealtime: vi.fn(),
      stopRealtime: vi.fn(),
      messages$: new Subject<ChatMessage>(),
      connection: signal('connected'),
      realtimeError: signal(''),
      getConversations: vi.fn(() => of([ownerChat, supportChat])),
      openListing: vi.fn(() => of(ownerChat)),
      openSupport: vi.fn(() => of(supportChat)),
      getMessages: vi.fn(() => of({ items: [], page: 0, totalPages: 0 })),
      markRead: vi.fn(() => of(null)),
      takeDraft: vi.fn(),
      conversationDraft: vi.fn(() => ''),
      saveConversationDraft: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ChatWidgetComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ChatService, useValue: api },
      ],
    });
    const fixture = TestBed.createComponent(ChatWidgetComponent);
    const widget = TestBed.inject(ChatWidgetService);
    return { fixture, widget, api };
  }

  it('opens the listing endpoint directly and shows only that listing owner', async () => {
    const { fixture, widget, api } = setup(RoleCode.TENANT);
    widget.openListing('selected-post');
    await fixture.whenStable();
    const view = fixture.nativeElement as HTMLElement;
    expect(api.openListing).toHaveBeenCalledExactlyOnceWith('selected-post');
    expect(api.openSupport).not.toHaveBeenCalled();
    expect(view.querySelector('.chat-heading h2')?.textContent).toContain('Property owner');
    expect(view.querySelector('input')).toBeNull();
    expect(view.textContent).not.toContain('Tìm người');
  });

  for (const role of [RoleCode.TENANT, RoleCode.LANDLORD]) {
    it(role + ' switches to the fixed support flow from the small window', async () => {
      const { fixture, widget, api } = setup(role);
      widget.openInbox();
      await fixture.whenStable();
      const view = fixture.nativeElement as HTMLElement;
      const support = Array.from(
        view.querySelectorAll<HTMLButtonElement>('.widget-tabs button'),
      ).find((button) => button.textContent?.includes('Hỗ trợ'));
      expect(support).toBeTruthy();
      support!.click();
      await fixture.whenStable();
      expect(api.openSupport).toHaveBeenCalledOnce();
      expect(api.openSupport.mock.calls[0]).toHaveLength(0);
      expect(view.querySelector('.chat-heading h2')?.textContent).toContain('Hỗ trợ Trọ Tốt');
      expect(view.querySelector('.chat-heading h2')?.textContent).not.toContain('Internal seeded');
      expect(view.querySelector('input')).toBeNull();
    });
  }

  it('does not offer an admin a support-to-self button', async () => {
    const { fixture, widget, api } = setup(RoleCode.ADMIN);
    widget.openInbox();
    await fixture.whenStable();
    const view = fixture.nativeElement as HTMLElement;
    expect(
      Array.from(view.querySelectorAll('.widget-tabs button')).some((button) =>
        button.textContent?.includes('Hỗ trợ'),
      ),
    ).toBe(false);
    expect(api.openSupport).not.toHaveBeenCalled();
  });
});
