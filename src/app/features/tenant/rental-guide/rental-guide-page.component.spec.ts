import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '@services/auth/auth.service';
import { RentalGuidePageComponent } from './rental-guide-page.component';

describe('Rental guide section links', () => {
  it.each([
    ['.guide-toc a', 'nhu-cau'],
    ['.guide-article__end a', 'guide-top'],
  ])('scrolls from %s without navigating away', (selector, targetId) => {
    TestBed.configureTestingModule({
      imports: [RentalGuidePageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { primaryRole: () => null } }],
    });
    const fixture = TestBed.createComponent(RentalGuidePageComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;
    const target = host.querySelector<HTMLElement>(`#${targetId}`)!;
    target.scrollIntoView = vi.fn();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    host.querySelector<HTMLAnchorElement>(selector)!.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(navigate).not.toHaveBeenCalled();
  });
});
