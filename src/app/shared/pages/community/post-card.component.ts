import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Dialog, DialogModule, DialogRef } from '@angular/cdk/dialog';
import { ClipboardFeedbackService } from '@services/common/clipboard-feedback.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { CommunityService } from '@services/community/community.service';
import { AuthService } from '@services/auth/auth.service';
import {
  CommunityPost,
  CommunityListing,
  Reaction,
  moderationLabels,
} from '@model/community/community.model';
import { CommunityCommentsComponent } from './community-comments.component';
import type { AuthorProfileComponent } from './author-profile.component';
import { AttachedListingPreviewComponent } from './attached-listing-preview.component';

@Component({
  selector: 'app-community-post-card',
  imports: [
    DatePipe,
    RouterLink,
    FormsModule,
    NgTemplateOutlet,
    DialogModule,
    CommunityCommentsComponent,
  ],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCardComponent {
  readonly post = input.required<CommunityPost>();
  readonly authorClickable = input(true);
  readonly changed = output<void>();
  readonly auth = inject(AuthService);
  private readonly service = inject(CommunityService);
  private readonly destroy = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly reportOpen = signal(false);
  readonly revealed = signal('');
  readonly labels = moderationLabels;
  readonly menuOpen = signal(false);
  readonly expanded = signal(false);
  readonly modalOpen = signal(false);
  readonly reactions: { type: Reaction; icon: string; label: string }[] = [
    { type: 'LIKE', icon: '👍', label: 'Thích' },
    { type: 'LOVE', icon: '❤️', label: 'Yêu thích' },
    { type: 'WOW', icon: '😮', label: 'Ngạc nhiên' },
  ];
  private readonly dialog = inject(Dialog);
  private readonly clipboard = inject(ClipboardFeedbackService);
  private readonly router = inject(Router);
  private readonly modal = viewChild.required<TemplateRef<unknown>>('postModal');
  private modalRef?: DialogRef;
  private authorRef?: DialogRef<unknown, AuthorProfileComponent>;
  private listingRef?: DialogRef<unknown, AttachedListingPreviewComponent>;
  private openingAuthor = false;
  reason = '';
  constructor() {
    this.destroy.onDestroy(() => {
      this.closeModal();
      this.authorRef?.close();
      this.listingRef?.close();
    });
  }
  openListingPreview(listing: CommunityListing): void {
    if (!listing.available || this.listingRef) return;
    this.listingRef = this.dialog.open(AttachedListingPreviewComponent, {
      data: { listingId: listing.id, title: listing.title },
      width: '720px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 32px)',
      ariaLabel: `Xem trước: ${listing.title}`,
      autoFocus: 'dialog',
    });
    this.listingRef.closed.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.listingRef = undefined;
    });
  }
  async openAuthor() {
    if (!this.authorClickable() || this.openingAuthor || this.authorRef) return;
    this.openingAuthor = true;
    this.menuOpen.set(false);
    try {
      const { AuthorProfileComponent } = await import('./author-profile.component');
      if (this.destroy.destroyed) return;
      this.authorRef = this.dialog.open(AuthorProfileComponent, {
        data: { authorId: this.post().authorId },
        width: '960px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100dvh - 32px)',
        ariaLabel: `Hồ sơ của ${this.post().authorName}`,
        autoFocus: 'dialog',
      });
      this.authorRef.closed.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
        this.authorRef = undefined;
        this.changed.emit();
      });
    } catch {
      this.error.set('Không thể mở hồ sơ. Vui lòng thử lại.');
    } finally {
      this.openingAuthor = false;
    }
  }
  openComments() {
    if (this.modalOpen()) {
      document.querySelector<HTMLTextAreaElement>('.post-modal textarea[name="content"]')?.focus();
      return;
    }
    this.menuOpen.set(false);
    this.modalOpen.set(true);
    this.modalRef = this.dialog.open(this.modal(), {
      width: '700px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 32px)',
      ariaLabel: `Bài viết của ${this.post().authorName}`,
      autoFocus: 'dialog',
    });
    this.modalRef.closed.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.modalOpen.set(false);
      this.menuOpen.set(false);
    });
  }
  closeModal() {
    this.modalRef?.close();
  }
  viewDetails() {
    this.closeModal();
    this.router.navigate(['/community/posts', this.post().id]);
  }
  share() {
    const path = this.router.serializeUrl(
      this.router.createUrlTree(['/community/posts', this.post().id]),
    );
    void this.clipboard.copy(
      new URL(path, document.baseURI).href,
      'Đã sao chép liên kết bài viết.',
      'Không thể sao chép liên kết. Vui lòng thử lại.',
    );
    this.menuOpen.set(false);
  }
  defaultReaction() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/dang-nhap']);
      return;
    }
    this.react(this.post().myReaction || 'LIKE');
  }
  run(request: Observable<unknown>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    request
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => this.changed.emit(),
        error: (e) => this.error.set(e.error?.message ?? 'Không thể thực hiện thao tác.'),
      });
  }
  react(type: Reaction) {
    this.run(
      this.service.reaction('POST', this.post().id, this.post().myReaction === type ? null : type),
    );
  }
  save() {
    this.menuOpen.set(false);
    this.run(this.service.bookmark(this.post().id, !this.post().saved));
  }
  follow() {
    this.menuOpen.set(false);
    this.run(this.service.follow(this.post().authorId, !this.post().following));
  }
  pin() {
    this.run(this.service.pin(this.post().id, !this.post().pinned));
  }
  remove() {
    if (confirm('Xóa bài viết này?')) this.run(this.service.deletePost(this.post().id));
  }
  report() {
    if (!this.reason.trim()) return;
    this.run(
      this.auth.session()?.id === this.post().authorId
        ? this.service.appeal(this.post().id, this.reason)
        : this.service.report('POST', this.post().id, this.reason),
    );
    this.reportOpen.set(false);
  }
  reveal() {
    this.service
      .reveal('POST', this.post().id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (text) => this.revealed.set(text),
        error: () => this.error.set('Vui lòng đăng nhập để xem nội dung bị hạn chế.'),
      });
  }
}
