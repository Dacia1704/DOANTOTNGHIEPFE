import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timer, filter } from 'rxjs';
import { CommunityService } from '@services/community/community.service';
import { AuthService } from '@services/auth/auth.service';
import {
  CommunityComment,
  CommunitySlice,
  moderationLabels,
} from '@model/community/community.model';

@Component({
  selector: 'app-community-comments',
  imports: [DatePipe, FormsModule, NgTemplateOutlet],
  templateUrl: './community-comments.component.html',
  styleUrl: './community-comments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityCommentsComponent implements OnInit {
  readonly postId = input.required<string>();
  readonly canComment = input(true);
  readonly authorId = input('');
  readonly auth = inject(AuthService);
  private readonly api = inject(CommunityService);
  private readonly destroy = inject(DestroyRef);
  readonly items = signal<CommunityComment[]>([]);
  readonly replies = signal<Record<string, CommunitySlice<CommunityComment>>>({});
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly replyTo = signal<string | null>(null);
  readonly editing = signal<CommunityComment | null>(null);
  readonly labels: Record<string, string> = moderationLabels;
  readonly notice = signal('');
  private cursor = '';
  readonly hasMore = signal(false);
  content = '';
  ngOnInit() {
    this.load(true);
    timer(5000, 5000)
      .pipe(
        filter(() => document.visibilityState === 'visible' && !this.busy()),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(() => {
        this.load(true);
        for (const root of Object.keys(this.replies())) this.loadReplies(root);
      });
  }
  load(reset = false) {
    if (this.loading()) return;
    this.loading.set(true);
    this.api
      .comments(this.postId(), '', reset ? '' : this.cursor)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (r) => {
          this.items.update((old) => (reset ? r.items : [...old, ...r.items]));
          this.cursor = r.nextCursor || '';
          this.hasMore.set(r.hasMore);
        },
        error: (e) => this.error.set(e.error?.message || 'Không tải được bình luận.'),
      });
  }
  loadReplies(id: string, more = false) {
    const old = this.replies()[id];
    this.api
      .comments(this.postId(), id, more ? old?.nextCursor || '' : '')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) =>
          this.replies.update((all) => ({
            ...all,
            [id]: { ...r, items: more ? [...(old?.items || []), ...r.items] : r.items },
          })),
        error: (e) => this.error.set(e.error?.message || 'Không tải được trả lời.'),
      });
  }
  selectReply(c: CommunityComment) {
    this.editing.set(null);
    this.replyTo.set(c.parentId || c.id);
    this.content = '';
  }
  edit(c: CommunityComment) {
    this.replyTo.set(c.parentId);
    this.editing.set(c);
    this.content = c.content || '';
  }
  cancel() {
    this.replyTo.set(null);
    this.editing.set(null);
    this.content = '';
  }
  submit() {
    if (this.busy() || !this.content.trim()) return;
    this.busy.set(true);
    this.error.set('');
    const parent = this.replyTo();
    const editing = this.editing();
    this.api
      .comment(
        this.postId(),
        { content: this.content, parentId: parent || undefined, expectedVersion: editing?.version },
        editing?.id,
      )
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (c) => {
          this.notice.set(c.status === 'VISIBLE' ? 'Đã gửi bình luận.' : this.labels[c.status]);
          this.cancel();
          this.load(true);
          if (parent) this.loadReplies(parent);
        },
        error: (e) => this.error.set(e.error?.message || 'Không gửi được bình luận.'),
      });
  }
  remove(c: CommunityComment) {
    if (!confirm('Xóa bình luận này?')) return;
    this.api
      .deleteComment(c.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.load(true);
          if (c.parentId) this.loadReplies(c.parentId);
        },
        error: (e) => this.error.set(e.error?.message || 'Không xóa được bình luận.'),
      });
  }
  react(c: CommunityComment) {
    this.api
      .reaction('POST_COMMENT', c.id, c.myReaction ? null : 'LIKE')
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.load(true);
          if (c.parentId) this.loadReplies(c.parentId);
        },
        error: (e) => this.error.set(e.error?.message || 'Không thể thả cảm xúc.'),
      });
  }
  report(c: CommunityComment) {
    const reason = prompt('Lý do báo cáo bình luận:');
    if (!reason?.trim()) return;
    this.api
      .report('POST_COMMENT', c.id, reason)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => this.notice.set('Đã gửi báo cáo.'),
        error: (e) => this.error.set(e.error?.message || 'Không gửi được báo cáo.'),
      });
  }
  reveal(c: CommunityComment) {
    this.api
      .reveal('POST_COMMENT', c.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (text) => {
          const replace = (items: CommunityComment[]) =>
            items.map((i) => (i.id === c.id ? { ...i, content: text } : i));
          this.items.update(replace);
          if (c.parentId)
            this.replies.update((all) => ({
              ...all,
              [c.parentId!]: { ...all[c.parentId!], items: replace(all[c.parentId!].items) },
            }));
        },
        error: () => this.error.set('Vui lòng đăng nhập để xem nội dung bị hạn chế.'),
      });
  }
}
