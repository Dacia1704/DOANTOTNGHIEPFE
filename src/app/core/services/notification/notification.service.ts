import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { catchError, debounceTime, fromEvent, merge, of, Subject, switchMap, tap, timer } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '@model/api-response';
import { AppNotification } from '@model/notification/notification.model';
import { AuthService } from '@services/auth/auth.service';
import { ChatService } from '@services/chat/chat.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly chat = inject(ChatService);
  private readonly api = `${environment.apiUrl}/notifications`;
  private readonly refresh = new Subject<void>();
  private readonly changes = new Subject<void>();
  private readonly userId = computed(() => this.auth.session()?.id ?? null);
  readonly unreadCount = signal(0);
  readonly countUnavailable = signal(false);
  readonly changes$ = this.changes.asObservable();

  constructor() {
    effect((onCleanup) => {
      const userId = this.userId();
      this.unreadCount.set(0);
      this.countUnavailable.set(false);
      if (!userId) return;
      // Share the authenticated chat socket. Poll/focus/reconnect recover updates missed offline.
      this.chat.startRealtime();
      const subscription = merge(
        timer(0, 60000), this.chat.notificationChanges$, this.chat.realtimeReady$,
        this.refresh, fromEvent(window, 'focus'),
      ).pipe(
        debounceTime(75),
        switchMap(() => this.http.get<ApiResponse<number>>(`${this.api}/unread-count`).pipe(
          catchError(() => of(null)),
        )),
      ).subscribe((response) => {
        this.countUnavailable.set(!response);
        if (response) this.unreadCount.set(response.data);
        this.changes.next();
      });
      onCleanup(() => {
        subscription.unsubscribe();
        this.chat.stopRealtime();
      });
    });
  }

  list(page = 0, unreadOnly = false) {
    const params = new HttpParams().set('page', page).set('size', 20).set('unreadOnly', unreadOnly);
    return this.http.get<ApiResponse<PageResponse<AppNotification>>>(this.api, { params });
  }

  markRead(id: string) {
    return this.http.put<ApiResponse<void>>(`${this.api}/${encodeURIComponent(id)}/read`, {})
      .pipe(tap(() => this.refresh.next()));
  }

  markAllRead() {
    return this.http.put<ApiResponse<void>>(`${this.api}/read-all`, {})
      .pipe(tap(() => this.refresh.next()));
  }
}
