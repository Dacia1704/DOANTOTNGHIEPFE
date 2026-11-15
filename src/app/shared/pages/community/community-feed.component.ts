import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  signal,
  TemplateRef,
  viewChild,
  afterNextRender,
} from '@angular/core';
import { Dialog, DialogModule, DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '@services/auth/auth.service';
import { CommunityService } from '@services/community/community.service';
import { CommunityPost, moderationLabels } from '@model/community/community.model';
import { PostCardComponent } from './post-card.component';
import { PostComposerComponent } from './post-composer.component';
import { FeedImpressionDirective } from '@shared/directives/feed-impression.directive';

@Component({
  selector: 'app-community-feed',
  imports: [
    FormsModule,
    RouterLink,
    PostCardComponent,
    DialogModule,
    PostComposerComponent,
    FeedImpressionDirective,
  ],
  templateUrl: './community-feed.component.html',
  styleUrl: './community-feed.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityFeedComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(CommunityService);
  private readonly destroy = inject(DestroyRef);
  readonly posts = signal<CommunityPost[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly tab = signal('LATEST');
  readonly hasMore = signal(false);
  readonly postNotice = signal('');
  private readonly dialog = inject(Dialog);
  private readonly composerModal = viewChild.required<TemplateRef<unknown>>('composerModal');
  private composerRef?: DialogRef;
  private cursor = '';
  private activeQuery = '';
  private generation = 0;
  private readonly feedEnd = viewChild.required<ElementRef<HTMLElement>>('feedEnd');
  private feedObserver?: IntersectionObserver;
  private feedRequest?: Subscription;
  private observerFrame?: number;
  q = '';
  constructor() {
    afterNextRender(() => {
      this.feedObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting) && !this.error()) this.load();
        },
        { rootMargin: '600px 0px' },
      );
      this.feedObserver.observe(this.feedEnd().nativeElement);
    });
    this.destroy.onDestroy(() => {
      this.closeComposer();
      this.feedObserver?.disconnect();
      if (this.observerFrame !== undefined) cancelAnimationFrame(this.observerFrame);
    });
  }
  openComposer() {
    if (this.composerRef) return;
    this.composerRef = this.dialog.open(this.composerModal(), {
      width: '560px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 32px)',
      ariaLabel: 'Tạo bài viết',
      autoFocus: this.auth.isLoggedIn() ? 'textarea' : 'dialog',
    });
    this.composerRef.closed.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.composerRef = undefined;
    });
  }
  closeComposer() {
    this.composerRef?.close();
  }
  onPosted(post: CommunityPost) {
    this.closeComposer();
    this.postNotice.set(
      post.status === 'VISIBLE'
        ? 'Đã đăng bài viết.'
        : 'Đã gửi bài viết · ' + moderationLabels[post.status],
    );
    this.tab.set('LATEST');
    this.load(true);
  }
  ngOnInit() {
    this.load(true);
  }
  select(tab: string) {
    this.tab.set(tab);
    this.load(true);
  }
  refreshPost(id: string) {
    this.api
      .post(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (post) =>
          this.posts.update((items) => items.map((item) => (item.id === id ? post : item))),
        error: (e) => {
          if (e.status === 404 || e.status === 410) {
            this.posts.update((items) => items.filter((item) => item.id !== id));
          } else {
            this.error.set('Không thể cập nhật bài viết. Vui lòng tải lại bảng tin.');
          }
        },
      });
  }
  load(reset = false) {
    if (this.loading() && !reset) return;
    if (!reset && (!this.hasMore() || !this.cursor)) return;
    const generation = ++this.generation;
    if (reset) {
      this.feedRequest?.unsubscribe();
      this.cursor = '';
      this.activeQuery = this.q.trim();
      this.posts.set([]);
      this.hasMore.set(false);
    }
    this.loading.set(true);
    this.error.set('');
    this.feedRequest = this.api
      .feed(this.tab(), this.cursor, this.activeQuery)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (generation === this.generation) {
            this.loading.set(false);
            this.observeFeedEnd();
          }
        }),
      )
      .subscribe({
        next: (result) => {
          if (generation !== this.generation) return;
          this.posts.update((old) =>
            reset
              ? result.items
              : [...new Map([...old, ...result.items].map((post) => [post.id, post])).values()],
          );
          this.cursor = result.nextCursor || '';
          this.hasMore.set(result.hasMore);
        },
        error: (e) => {
          if (e.error?.errorCode === 'FEED_SESSION_EXPIRED' && generation === this.generation) {
            this.load(true);
            return;
          }
          if (generation === this.generation)
            this.error.set(e.error?.message ?? 'Không tải được bảng tin. Vui lòng thử lại.');
        },
      });
  }
  private observeFeedEnd(): void {
    if (!this.feedObserver || this.destroy.destroyed) return;
    if (this.observerFrame !== undefined) cancelAnimationFrame(this.observerFrame);
    this.observerFrame = requestAnimationFrame(() => {
      if (this.destroy.destroyed) return;
      const end = this.feedEnd().nativeElement;
      this.feedObserver?.unobserve(end);
      this.feedObserver?.observe(end);
    });
  }
}
