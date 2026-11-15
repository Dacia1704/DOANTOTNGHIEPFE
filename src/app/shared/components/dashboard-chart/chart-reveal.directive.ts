import { Directive, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';

/** Reveal each chart once when it enters the dashboard's scrolling viewport. */
@Directive({
  selector: '[appChartReveal]',
  host: { class: 'chart-reveal', '[class.chart-visible]': 'visible()' },
})
export class ChartRevealDirective {
  readonly visible = signal(false);
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (
        !('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        this.visible.set(true);
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.visible.set(true);
            observer.disconnect();
          }
        },
        { threshold: 0.15 },
      );
      observer.observe(this.element.nativeElement);
      this.destroy.onDestroy(() => observer.disconnect());
    });
  }
}
