import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { environment } from '@environments/environment';
import { AuthService } from '@services/auth/auth.service';
import { ChatService } from '@services/chat/chat.service';
import { NotificationService } from './notification.service';

describe('Notification session and realtime recovery', () => {
  const api = `${environment.apiUrl}/notifications`;
  function setup() {
    const session = signal<{ id: string } | null>({ id: 'first' });
    const incoming = new Subject<void>();
    const reconnected = new Subject<void>();
    const chat = { startRealtime: vi.fn(), stopRealtime: vi.fn(),
      notificationChanges$: incoming, realtimeReady$: reconnected };
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { session } }, { provide: ChatService, useValue: chat }] });
    const service = TestBed.inject(NotificationService);
    TestBed.tick();
    return { service, session, chat, incoming, reconnected, http: TestBed.inject(HttpTestingController) };
  }
  async function debounce() { await vi.advanceTimersByTimeAsync(100); }
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); });

  it('shares the socket and refreshes unread counts on notifications and reconnection', async () => {
    const { service, chat, incoming, reconnected, http } = setup();
    await debounce();http.expectOne(`${api}/unread-count`).flush({ data: 2 });
    expect(chat.startRealtime).toHaveBeenCalledOnce();expect(service.unreadCount()).toBe(2);
    incoming.next();incoming.next();await debounce();
    http.expectOne(`${api}/unread-count`).flush({ data: 3 });expect(service.unreadCount()).toBe(3);
    reconnected.next();await debounce();
    http.expectOne(`${api}/unread-count`).flush({ data: 4 });expect(service.unreadCount()).toBe(4);
    http.verify();
  });

  it('cancels requests and clears counts when the user logs out or changes accounts', async () => {
    const { service, session, http, chat } = setup();
    await debounce();const pending = http.expectOne(`${api}/unread-count`);
    session.set({ id: 'second' });TestBed.tick();
    expect(pending.cancelled).toBe(true);expect(service.unreadCount()).toBe(0);
    await debounce();http.expectOne(`${api}/unread-count`).flush({ data: 7 });
    session.set(null);TestBed.tick();expect(service.unreadCount()).toBe(0);
    expect(chat.stopRealtime).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(61000);http.expectNone(`${api}/unread-count`);
  });

  it('recovers after an HTTP failure and refreshes the count after marking all read', async () => {
    const { service, incoming, http } = setup();await debounce();
    http.expectOne(`${api}/unread-count`).flush('', { status: 503, statusText: 'Unavailable' });
    expect(service.countUnavailable()).toBe(true);
    incoming.next();await debounce();http.expectOne(`${api}/unread-count`).flush({ data: 5 });
    expect(service.countUnavailable()).toBe(false);
    service.markAllRead().subscribe();http.expectOne(`${api}/read-all`).flush({ code: 200 });
    await debounce();http.expectOne(`${api}/unread-count`).flush({ data: 0 });
    expect(service.unreadCount()).toBe(0);http.verify();
  });

  it('sends paging and unread filtering to the authenticated API', () => {
    const { service, http } = setup();service.list(2, true).subscribe();
    const request = http.expectOne((req) => req.url === api);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('unreadOnly')).toBe('true');
    request.flush({ data: { data: [], totalPages: 0 } });
  });
});
