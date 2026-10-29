import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ChatWidgetService } from './core/services/chat-widget.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('keeps the chat window closed until requested', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#chat-widget')).toBeNull();
  });

  it('opens a guest chat prompt without opening an authenticated inbox', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(ChatWidgetService).openInbox();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#chat-widget')?.textContent).toContain('Đăng nhập để nhắn tin');
    expect(compiled.querySelector('app-chat-page')).toBeNull();
  });
});
