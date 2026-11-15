import { Directive, ElementRef, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from '@services/auth/auth.service';
import { environment } from '@environments/environment';

type Surface = 'LISTING' | 'COMMUNITY';

@Injectable({ providedIn: 'root' })
export class FeedImpressions {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly pending = new Map<Surface, Set<string>>();
  private timer?: ReturnType<typeof setTimeout>;
  private actor?: string;
  record(surface: Surface, id: string) {
    if (!this.auth.isLoggedIn()) return;
    const actor = this.auth.session()?.id;
    if (this.actor !== actor) {
      this.pending.clear();
      this.actor = actor;
    }
    if (!this.pending.has(surface)) this.pending.set(surface, new Set());
    this.pending.get(surface)!.add(id);
    this.timer ??= setTimeout(() => this.flush(), 500);
  }
  private flush() {
    this.timer = undefined;
    const batches = [...this.pending.entries()];
    this.pending.clear();
    if (!this.auth.isLoggedIn() || this.actor !== this.auth.session()?.id) return;
    for (const [surface, ids] of batches) {
      const values = [...ids];
      for (let start = 0; start < values.length; start += 50) {
        this.http
          .post(`${environment.apiUrl}/discovery/impressions`, {
            surface,
            ids: values.slice(start, start + 50),
          })
          .subscribe({
            error: () => {
              /* Tracking must not interrupt browsing. */
            },
          });
      }
    }
  }
}

/** Count only cards at least half visible for one continuous second. */
@Directive({ selector: '[appFeedImpression]' })
export class FeedImpressionDirective implements OnChanges, OnDestroy {
  @Input({ required: true }) appFeedImpression!: Surface;
  @Input({ required: true }) impressionId!: string;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly events = inject(FeedImpressions);
  private observer?: IntersectionObserver;
  private timer?: ReturnType<typeof setTimeout>;
  ngOnChanges() {
    this.stop();
    if (!this.impressionId || typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5,
        );
        clearTimeout(this.timer);
        if (visible)
          this.timer = setTimeout(() => {
            if (document.visibilityState === 'visible') {
              this.events.record(this.appFeedImpression, this.impressionId);
              this.observer?.disconnect();
            }
          }, 1000);
      },
      { threshold: [0.5] },
    );
    this.observer.observe(this.host.nativeElement);
  }
  private stop() {
    this.observer?.disconnect();
    clearTimeout(this.timer);
  }
  ngOnDestroy() {
    this.stop();
  }
}
