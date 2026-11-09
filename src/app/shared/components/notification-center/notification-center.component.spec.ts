import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RoleCode } from '@model/auth/auth.model';
import { AppNotification } from '@model/notification/notification.model';
import { AuthService } from '@services/auth/auth.service';
import { NotificationService } from '@services/notification/notification.service';
import { NotificationCenterComponent } from './notification-center.component';

describe('Notification center', () => {
  const item: AppNotification = { id: 'one', type: 'RENTAL_AGREEMENT', title: 'Hợp đồng đã sẵn sàng',
    body: 'Vui lòng xác nhận hợp đồng.', referenceType: 'RENTAL_AGREEMENT', referenceId: 'agreement',
    read: false, createdAt: '2026-11-08T10:00:00' };
  function setup() {
    const session = signal({ id: 'tenant' });
    const service = { unreadCount: signal(1), countUnavailable: signal(false), changes$: new Subject<void>(),
      list: vi.fn(() => of({ data: { data: [item], totalPages: 2 } })),
      markRead: vi.fn(() => of({})), markAllRead: vi.fn(() => of({})) };
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: NotificationService, useValue: service },
      { provide: AuthService, useValue: { primaryRole: () => RoleCode.TENANT, session } }] });
    const fixture = TestBed.createComponent(NotificationCenterComponent);fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, service, session };
  }
  it('opens a labelled dialog with real unread counts and filters', () => {
    const { fixture, component, service } = setup();
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toContain('1 chưa đọc');
    component.toggle();fixture.detectChanges();
    expect(document.body.querySelector('[role="dialog"][aria-label="Thông báo"]')?.textContent).toContain(item.title);
    component.filter(true);expect(service.list).toHaveBeenLastCalledWith(0, true);
    component.load(true);expect(service.list).toHaveBeenLastCalledWith(1, true);
    expect(component.items()).toHaveLength(1);
    expect(component.date(item.createdAt).toISOString()).toBe('2026-11-08T03:00:00.000Z');
  });
  it('marks the selected notification before navigating to its agreement', () => {
    const { component, service } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.toggle();component.select(item);
    expect(service.markRead).toHaveBeenCalledWith('one');
    expect(navigate).toHaveBeenCalledWith(['/hop-dong', 'agreement']);
    expect(component.opened()).toBe(false);
  });
  it('keeps the panel open and offers retry when loading fails', () => {
    const { component, service, fixture } = setup();
    service.list.mockReturnValue(throwError(() => new Error('offline')));
    component.toggle();fixture.detectChanges();
    expect(component.opened()).toBe(true);expect(component.loading()).toBe(false);
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('Thử lại');
  });
  it('clears the previous inbox and cancels pending navigation when accounts change', () => {
    const { component, service, session } = setup();
    const pending = new Subject<{}>();
    service.markRead.mockReturnValue(pending);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.toggle();component.select(item);
    session.set({ id: 'another' });TestBed.tick();
    pending.next({});
    expect(component.items()).toEqual([]);expect(component.opened()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
