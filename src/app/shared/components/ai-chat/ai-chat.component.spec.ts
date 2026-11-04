import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AiService } from '@services/ai/ai.service';
import { AuthService } from '@services/auth/auth.service';
import { AiChatComponent } from './ai-chat.component';

describe('AI chat launcher', () => {
  async function setup(role: string | null = 'ROLE_TENANT') {
    TestBed.configureTestingModule({
      imports: [AiChatComponent],
      providers: [
        { provide: AuthService, useValue: {
          session: signal(role ? { id: role, roles: [role] } : null),
          hasPermission: (permission: string) => permission === role,
        } },
        { provide: AiService, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(AiChatComponent);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('.launcher') as HTMLButtonElement;
    button.setPointerCapture = vi.fn();
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: window.innerWidth - 84, top: 200, width: 72, height: 72,
    } as DOMRect);
    function pointer(type: string, x: number, y: number) {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, { pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: y });
      button.dispatchEvent(event);
    }
    return { fixture, button, pointer, component: fixture.componentInstance };
  }

  it.each([null, 'ROLE_TENANT', 'ROLE_LANDLORD', 'ROLE_ADMIN'])(
    'shows and opens the AI launcher for session role %s', async (role) => {
      const { fixture, button } = await setup(role);
      expect(button).toBeTruthy();
      button.click();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('#ai-chat-panel')).toBeTruthy();
    },
  );

  it('opens on a tap without treating small hand movement as dragging', async () => {
    const { fixture, button, pointer } = await setup();
    pointer('pointerdown', 800, 220);
    pointer('pointermove', 802, 222);
    pointer('pointerup', 802, 222);
    button.dispatchEvent(new MouseEvent('click', { detail: 1 }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.panel-left')).toBeTruthy();
  });

  for (const side of ['left', 'right'] as const) {
    it(`snaps to the nearest ${side} edge without opening, then opens chat on that side`, async () => {
      const { fixture, button, pointer, component } = await setup();
      const start = window.innerWidth - 48;
      const target = window.innerWidth * (side === 'left' ? 0.4 : 0.6);
      pointer('pointerdown', start, 220);
      pointer('pointermove', target, 280);
      pointer('pointerup', target, 280);
      button.dispatchEvent(new MouseEvent('click', { detail: 1 }));
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.panel')).toBeNull();
      expect(component.launcherPosition()?.x).toBe(side === 'left' ? 12 : window.innerWidth - 84);
      button.click();
      await fixture.whenStable();
      const panel = fixture.nativeElement.querySelector('.panel') as HTMLElement;
      expect(panel).toBeTruthy();
      expect(panel.classList.contains('panel-left')).toBe(side === 'left');
      component.close();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.launcher').style.left)
        .toBe(`${side === 'left' ? 12 : window.innerWidth - 84}px`);
    });
  }

  it('keeps the launcher visible after dragging outside the viewport and resizing', async () => {
    const { fixture, pointer, component } = await setup();
    pointer('pointerdown', window.innerWidth - 48, 220);
    pointer('pointermove', 2000, 2000);
    pointer('pointercancel', 2000, 2000);
    expect(component.opened()).toBe(false);
    expect(component.launcherPosition()?.y).toBe(window.innerHeight - 84);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);
    window.dispatchEvent(new Event('resize'));
    await fixture.whenStable();
    expect(component.launcherPosition()).toEqual({ x: 306, y: 516 });
    vi.restoreAllMocks();
  });

  it('preserves an unfinished question when the chat is minimized and restored', async () => {
    const { fixture, button } = await setup();
    button.click();
    await fixture.whenStable();
    const view = fixture.nativeElement as HTMLElement;
    const textarea = view.querySelector('textarea')!;
    textarea.value = 'Tìm phòng dưới 3 triệu';
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    view.querySelector<HTMLButtonElement>('[aria-label="Thu nhỏ cửa sổ AI chat"]')!.click();
    await fixture.whenStable();
    expect(view.querySelector<HTMLElement>('#ai-chat-body')!.hidden).toBe(true);
    expect(view.querySelector('.launcher')).toBeNull();
    view.querySelector<HTMLButtonElement>('.widget-title')!.click();
    await fixture.whenStable();
    expect(view.querySelector<HTMLElement>('#ai-chat-body')!.hidden).toBe(false);
    expect(view.querySelector('textarea')!.value).toBe('Tìm phòng dưới 3 triệu');
    expect(view.querySelector<HTMLButtonElement>('[aria-label="Gửi câu hỏi"]')!.disabled).toBe(false);
  });
});
