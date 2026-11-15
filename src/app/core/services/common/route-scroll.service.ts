import { DestroyRef, Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, NavigationStart, Router, Scroll } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type Position = readonly [number, number];

/** Complements router window scrolling for dashboard containers and delayed page content. */
@Injectable({ providedIn: 'root' })
export class RouteScrollService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly positions = new Map<number, Position>();
  private navigationId = this.router.lastSuccessfulNavigation()?.id ?? 0;
  private restoredId: number | null = null;
  private cancelPending = () => {};

  constructor() {
    this.router.events.pipe(takeUntilDestroyed(this.destroy)).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.cancelPending();
        const container = this.container();
        if (container)
          this.positions.set(this.navigationId, [container.scrollLeft, container.scrollTop]);
        while (this.positions.size > 200)
          this.positions.delete(this.positions.keys().next().value!);
        this.restoredId =
          event.navigationTrigger === 'popstate'
            ? (event.restoredState?.navigationId ?? null)
            : null;
      } else if (event instanceof NavigationEnd) {
        this.navigationId = event.id;
      } else if (event instanceof Scroll) {
        this.restore(event);
      }
    });
    this.destroy.onDestroy(() => this.cancelPending());
  }

  private container(): HTMLElement | null {
    return this.document.querySelector('.dashboard-layout mat-sidenav-content');
  }

  private restore(event: Scroll) {
    if (event.routerEvent.id !== this.navigationId) return;
    this.cancelPending();
    const window = this.document.defaultView;
    if (!window) return;
    const containerPosition =
      this.restoredId === null ? ([0, 0] as const) : this.positions.get(this.restoredId);
    // The router already restores the window. Retry a saved position if API content was too short initially.
    const windowPosition = event.position ?? (this.restoredId === null ? ([0, 0] as const) : null);
    let frame = 0;
    let timeout = 0;
    let observer: ResizeObserver | undefined;
    const stop = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      observer?.disconnect();
      for (const name of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
        window.removeEventListener(name, stop);
    };
    const apply = () => {
      if (event.routerEvent.id !== this.navigationId) {
        stop();
        return;
      }
      const container = this.container();
      let ready = true;
      if (windowPosition) {
        window.scrollTo({ left: windowPosition[0], top: windowPosition[1], behavior: 'instant' });
        ready = Math.abs(window.scrollY - windowPosition[1]) < 2;
      }
      if (container && containerPosition) {
        container.scrollTo({
          left: containerPosition[0],
          top: containerPosition[1],
          behavior: 'instant',
        });
        ready &&= Math.abs(container.scrollTop - containerPosition[1]) < 2;
      }
      // Returning pages may already fit while API placeholders still change height above the viewport.
      // Keep observing briefly on history navigation; any user interaction cancels the restoration.
      if (ready && this.restoredId === null) stop();
    };
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(apply);
      });
      observer.observe(this.document.body);
      const content = this.document.querySelector('.dashboard-layout__main');
      if (content) observer.observe(content);
    }
    for (const name of ['wheel', 'touchstart', 'pointerdown', 'keydown'])
      window.addEventListener(name, stop, { passive: true });
    timeout = window.setTimeout(stop, 5000);
    frame = window.requestAnimationFrame(apply);
    this.cancelPending = stop;
  }
}
