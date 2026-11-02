import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';
import { AuthService } from '@services/auth.service';
import {
  AiChatDone,
  AiChatListings,
  AiChatMeta,
  AiEventRequest,
  AiFeedbackRequest,
  AiRecommendationResponse,
} from '@model/ai/ai.model';

/**
 * Client cho AI service.
 *
 * - /ai/recommendations, /ai/feedback, /ai/events: JSON thuong.
 * - /ai/chat: SSE. Dung fetch + ReadableStream vi HttpClient khong ho tro
 *   streaming response theo kieu nay.
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.aiUrl}`;

  getRecommendations(limit = 10, source: 'HOME' | 'SEARCH' | 'CHATBOT' = 'HOME'): Observable<AiRecommendationResponse> {
    const params = new HttpParams().set('limit', limit).set('source', source);
    return this.http.get<AiRecommendationResponse>(`${this.api}/recommendations`, { params });
  }

  sendFeedback(request: AiFeedbackRequest): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.api}/feedback`, request);
  }

  sendEvent(request: AiEventRequest): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.api}/events`, request);
  }

  /**
   * Bat dau hoi thoai chatbot. Tra ve Observable phat tung su kien SSE.
   *
   * Su kien: 'meta' | 'token' | 'listings' | 'retry' | 'done'.
   */
  streamChat(
    message: string,
    conversationId?: string | null,
  ): Observable<AiChatEvent> {
    return new Observable<AiChatEvent>(subscriber => {
      const controller = new AbortController();
      const request = () => fetch(`${this.api}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(this.getAccessToken() ? { Authorization: `Bearer ${this.getAccessToken()}` } : {}),
        },
        body: JSON.stringify({ message, conversation_id: conversationId ?? null }),
        signal: controller.signal,
      });
      request()
        .then(async response => {
          if (response.status === 401 && this.auth.refreshToken) {
            try {
              await firstValueFrom(this.auth.refresh());
            } catch (error) {
              this.auth.clearSession();
              throw error;
            }
            if (controller.signal.aborted) return;
            response = await request();
          }
          if (!response.ok || !response.body) {
            const detail = await response.json().catch(() => null);
            throw new Error(typeof detail?.detail === 'string' ? detail.detail : `AI service trả HTTP ${response.status}`);
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let finished = false;

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            buffer = buffer.replace(/\r\n/g, '\n');

            let boundary = buffer.indexOf('\n\n');
            while (boundary !== -1) {
              const raw = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              const event = parseSseChunk(raw);
              if (event) {
                finished ||= event.type === 'done';
                subscriber.next(event);
              }
              boundary = buffer.indexOf('\n\n');
            }
          }
          if (!finished && !controller.signal.aborted) {
            throw new Error('Kết nối AI bị ngắt trước khi hoàn tất. Bạn có thể thử lại.');
          }
          subscriber.complete();
        })
        .catch(error => {
          if (error?.name === 'AbortError') {
            subscriber.complete();
            return;
          }
          subscriber.error(error);
        });

      return () => controller.abort();
    });
  }

  private getAccessToken(): string | null {
    return this.auth.accessToken;
  }
}

export type AiChatEvent =
  | { type: 'meta'; data: AiChatMeta }
  | { type: 'token'; data: { text: string } }
  | { type: 'listings'; data: AiChatListings }
  | { type: 'retry'; data: { reason: string } }
  | { type: 'done'; data: AiChatDone };

export function parseSseChunk(raw: string): AiChatEvent | null {
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (!dataLines.length) return null;

  let data: unknown;
  try {
    data = JSON.parse(dataLines.join('\n'));
  } catch {
    return null;
  }

  switch (event) {
    case 'meta':
      return { type: 'meta', data: data as AiChatMeta };
    case 'token':
      return { type: 'token', data: data as { text: string } };
    case 'listings':
      return { type: 'listings', data: data as AiChatListings };
    case 'retry':
      return { type: 'retry', data: data as { reason: string } };
    case 'done':
      return { type: 'done', data: data as AiChatDone };
    default:
      return null;
  }
}
