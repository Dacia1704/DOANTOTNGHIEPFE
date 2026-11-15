import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  input,
  signal,
  output,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
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
  readonly changed = output<void>();
  readonly compact = input(false);
  readonly postId = input.required<string>();
  readonly canComment = input(true);
  readonly authorId = input('');
  readonly auth = inject(AuthService);
  private readonly api = inject(CommunityService);
  private readonly destroy = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly items = signal<CommunityComment[]>([]);
  readonly replies = signal<Record<string, CommunitySlice<CommunityComment>>>({});
  readonly expandedReplies = signal<Set<string>>(new Set());
  readonly loadingReplies = signal<Set<string>>(new Set());
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly replyTo = signal<string | null>(null);
  readonly replyTarget = signal<CommunityComment | null>(null);
  readonly editing = signal<CommunityComment | null>(null);
  readonly labels: Record<string, string> = moderationLabels;
  readonly notice = signal('');
  private cursor = '';
  readonly hasMore = signal(false);
  content = '';
  ngOnInit() {
    this.load(true);
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
          this.items.update((old) => (reset ? r.items : this.mergeComments(r.items, old)));
          this.cursor = r.nextCursor || '';
          this.hasMore.set(r.hasMore);
        },
        error: (e) => this.error.set(e.error?.message || 'Không tải được bình luận.'),
      });
  }
  toggleReplies(id: string): void {
    const expanded = new Set(this.expandedReplies());
    if (expanded.has(id)) {
      expanded.delete(id);
      this.expandedReplies.set(expanded);
      return;
    }
    expanded.add(id);
    this.expandedReplies.set(expanded);
    this.loadReplies(id);
  }
  replyCount(comment: CommunityComment): number {
    return (
      comment.replyCount ??
      this.replies()[comment.id]?.items.filter((item) => !item.deleted).length ??
      0
    );
  }
  loadReplies(id: string, more = false) {
    if (this.loadingReplies().has(id) || (!more && this.replies()[id])) return;
    this.loadingReplies.update((all) => new Set(all).add(id));
    const old = this.replies()[id];
    this.api
      .comments(this.postId(), id, more ? old?.nextCursor || '' : '')
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() =>
          this.loadingReplies.update((all) => {
            const next = new Set(all);
            next.delete(id);
            return next;
          }),
        ),
      )
      .subscribe({
        next: (r) =>
          this.replies.update((all) => ({
            ...all,
            [id]: { ...r, items: this.mergeComments(r.items, all[id]?.items || []) },
          })),
        error: (e) => this.error.set(e.error?.message || 'Không tải được trả lời.'),
      });
  }
  selectReply(c: CommunityComment) {
    this.editing.set(null);
    const root = c.parentId || c.id;
    this.replyTo.set(root);
    this.replyTarget.set(c);
    this.expandedReplies.update((all) => new Set(all).add(c.id));
    this.loadReplies(c.id);
    this.content = '';
    this.host.nativeElement.querySelector('textarea')?.focus();
  }
  edit(c: CommunityComment) {
    this.replyTarget.set(null);
    this.replyTo.set(c.parentId);
    this.editing.set(c);
    this.content = c.content || '';
    this.host.nativeElement.querySelector('textarea')?.focus();
  }
  cancel() {
    this.replyTo.set(null);
    this.replyTarget.set(null);
    this.editing.set(null);
    this.content = '';
  }
  onCommentEnter(event: Event): void {
    const keyboard = event as KeyboardEvent;
    if (keyboard.shiftKey || keyboard.isComposing || keyboard.keyCode === 229) return;
    keyboard.preventDefault();
    if (!keyboard.repeat) this.submit();
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
        {
          content: this.content,
          parentId: parent || undefined,
          replyToId: editing ? undefined : this.replyTarget()?.id,
          expectedVersion: editing?.version,
        },
        editing?.id,
      )
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (c) => {
          if (editing) this.patchComment(c.id, () => c);
          else this.insertComment(c);
          this.changed.emit();
          this.notice.set(c.status === 'VISIBLE' ? 'Đã gửi bình luận.' : this.labels[c.status]);
          this.cancel();
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
          const parent = c.replyToId || c.parentId;
          if (parent && !c.deleted && this.replyCount(c) === 0) {
            this.patchComment(parent, (comment) => ({
              ...comment,
              replyCount: Math.max(0, this.replyCount(comment) - 1),
            }));
          }
          this.patchComment(c.id, (comment) => ({ ...comment, deleted: true, content: null }));
          if (this.replyTarget()?.id === c.id || this.editing()?.id === c.id) this.cancel();
          this.changed.emit();
        },
        error: (e) => this.error.set(e.error?.message || 'Không xóa được bình luận.'),
      });
  }
  readonly reacting = signal<Set<string>>(new Set());
  react(c: CommunityComment) {
    if (this.reacting().has(c.id)) return;
    this.reacting.update((all) => new Set(all).add(c.id));
    this.api
      .reaction('POST_COMMENT', c.id, c.myReaction ? null : 'LIKE')
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() =>
          this.reacting.update((all) => {
            const next = new Set(all);
            next.delete(c.id);
            return next;
          }),
        ),
      )
      .subscribe({
        next: () => {
          this.patchComment(c.id, (comment) => ({
            ...comment,
            myReaction: c.myReaction ? null : 'LIKE',
            reactionCount: Math.max(0, comment.reactionCount + (c.myReaction ? -1 : 1)),
          }));
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
          this.patchComment(c.id, (comment) => ({ ...comment, content: text }));
        },
        error: () => this.error.set('Vui lòng đăng nhập để xem nội dung bị hạn chế.'),
      });
  }
  private mergeComments(
    incoming: CommunityComment[],
    existing: CommunityComment[],
  ): CommunityComment[] {
    return [
      ...new Map([...incoming, ...existing].map((comment) => [comment.id, comment])).values(),
    ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  }
  private patchComment(id: string, update: (comment: CommunityComment) => CommunityComment): void {
    const replace = (items: CommunityComment[]) =>
      items.map((comment) => (comment.id === id ? update(comment) : comment));
    this.items.update(replace);
    this.replies.update((all) =>
      Object.fromEntries(
        Object.entries(all).map(([key, group]) => [key, { ...group, items: replace(group.items) }]),
      ),
    );
  }
  private insertComment(comment: CommunityComment): void {
    const parent = comment.replyToId || comment.parentId;
    if (!parent) {
      this.items.update((items) => this.mergeComments([comment], items));
      return;
    }
    this.patchComment(parent, (target) => ({ ...target, replyCount: this.replyCount(target) + 1 }));
    this.replies.update((all) => ({
      ...all,
      [parent]: {
        ...(all[parent] || { nextCursor: null, hasMore: false }),
        items: this.mergeComments([comment], all[parent]?.items || []),
      },
    }));
  }
}
