import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '@services/auth/auth.service';
import { ChatService } from '@services/chat/chat.service';
import { RoleCode } from '@model/auth/auth.model';
import { ChatConversation } from '@model/chat/chat.model';
import { SiteHeaderComponent } from '@shared/components/site-header/site-header.component';
import { ChatPageComponent } from '@shared/pages/chat/chat-page.component';
import { NotificationService } from '@services/notification/notification.service';
import { EMPTY } from 'rxjs';

describe('admin header and support navigation', () => {
  const logout = vi.fn();
  beforeEach(() => {
    logout.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            primaryRole: () => RoleCode.ADMIN,
            hasAnyRole: (roles: RoleCode[]) => roles.includes(RoleCode.ADMIN),
            session: () => ({ id: 'admin', fullName: 'Quản trị viên' }),
            isLoggedIn: () => true,
            logout,
          },
        },
        { provide: ChatService, useValue: {} },
        { provide: NotificationService, useValue: {
          unreadCount: () => 0, countUnavailable: () => false, changes$: EMPTY,
        } },
      ],
    });
  });

  it.each([false, true])(
    'shows only profile, dashboard and logout with adminMode=%s',
    async (adminMode) => {
      const fixture = TestBed.createComponent(SiteHeaderComponent);
      fixture.componentRef.setInput('adminMode', adminMode);
      fixture.detectChanges();
      expect(!!fixture.nativeElement.querySelector('.site-header--dashboard')).toBe(adminMode);
      fixture.nativeElement.querySelector('.site-header__avatar-trigger').click();
      fixture.detectChanges();
      await fixture.whenStable();
      const menu = document.body.querySelector('.site-header__user-menu')!;
      expect(menu.querySelectorAll('[role="menuitem"]')).toHaveLength(3);
      expect([...menu.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
        '/trang-ca-nhan',
        '/admin',
      ]);
      expect(menu.textContent).toContain('Trang quản trị');
      (menu.querySelector('button') as HTMLButtonElement).click();
      expect(logout).toHaveBeenCalledOnce();
    },
  );

  it('keeps selected support conversations inside the admin dashboard route', () => {
    const page = TestBed.createComponent(ChatPageComponent).componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.selectConversation({ id: 'support-thread' } as ChatConversation);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/admin/messages'], {
      queryParams: { conversation: 'support-thread' },
    });
  });
});
