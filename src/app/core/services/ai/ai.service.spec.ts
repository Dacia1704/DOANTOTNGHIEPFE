import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of, toArray } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiService } from './ai.service';
import { AuthService } from '../auth/auth.service';

function streamed(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  }), { headers: { 'Content-Type': 'text/event-stream' } });
}

function setup() {
  const auth = { accessToken: 'old', refreshToken: 'refresh',
    refresh: vi.fn(() => { auth.accessToken = 'new'; return of(void 0); }), clearSession: vi.fn() };
  TestBed.configureTestingModule({ providers: [
    { provide: HttpClient, useValue: {} }, { provide: AuthService, useValue: auth },
  ] });
  return { service: TestBed.inject(AiService), auth };
}

afterEach(() => { vi.unstubAllGlobals(); TestBed.resetTestingModule(); });

describe('AI streaming client', () => {
  it('reads split CRLF frames and Vietnamese tokens', async () => {
    const { service } = setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamed([
      'event: token\r\ndata: {"text":"Phòng"}\r', '\n\r\n',
      'event: done\r\ndata: {"status":"OK"}\r\n\r\n',
    ])));
    const events = await firstValueFrom(service.streamChat('test').pipe(toArray()));
    expect(events).toEqual([{ type: 'token', data: { text: 'Phòng' } }, { type: 'done', data: { status: 'OK' } }]);
  });

  it('refreshes once on HTTP 401 before opening the stream', async () => {
    const { service, auth } = setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(streamed(['event: done\ndata: {"status":"OK"}\n\n']));
    vi.stubGlobal('fetch', fetchMock);
    await firstValueFrom(service.streamChat('test').pipe(toArray()));
    expect(auth.refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer new');
  });

  it('reports quota details and never retries a partial stream', async () => {
    const { service, auth } = setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{"detail":"Hết lượt chat"}', { status: 429 }))
      .mockResolvedValueOnce(streamed(['event: token\ndata: {"text":"partial"}\n\n']));
    vi.stubGlobal('fetch', fetchMock);
    await expect(firstValueFrom(service.streamChat('test').pipe(toArray()))).rejects.toThrow('Hết lượt chat');
    await expect(firstValueFrom(service.streamChat('test').pipe(toArray()))).rejects.toThrow('bị ngắt');
    expect(auth.refresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts the HTTP request when unsubscribed', () => {
    const { service } = setup();
    const fetchMock = vi.fn((_url: unknown, _options: RequestInit) => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const subscription = service.streamChat('test').subscribe();
    const signal = fetchMock.mock.calls[0][1].signal!;
    subscription.unsubscribe();
    expect(signal.aborted).toBe(true);
  });
});
