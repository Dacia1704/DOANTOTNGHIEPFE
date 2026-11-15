import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ModerationService } from '@services/community/moderation.service';
import {
  ModerationCase,
  ModerationRule,
  ModerationStatus,
  moderationLabels,
} from '@model/community/community.model';

@Component({
  selector: 'app-community-moderation',
  imports: [FormsModule, DatePipe],
  templateUrl: './community-moderation.component.html',
  styleUrl: './community-moderation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityModerationComponent implements OnInit {
  private readonly api = inject(ModerationService);
  private readonly destroy = inject(DestroyRef);
  readonly tab = signal<'cases' | 'rules'>('cases');
  readonly cases = signal<ModerationCase[]>([]);
  readonly rules = signal<ModerationRule[]>([]);
  readonly selected = signal<ModerationCase | null>(null);
  readonly draft = signal<ModerationRule | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly labels = moderationLabels;
  resolved = false;
  page = 0;
  reason = '';
  decision: ModerationStatus = 'VISIBLE';
  testText = '';
  testScope = 'POST';
  query = signal('');
  readonly filtered = computed(() =>
    this.cases().filter((c) =>
      [c.authorName, c.reason, c.targetType]
        .join(' ')
        .toLocaleLowerCase('vi')
        .includes(this.query().toLocaleLowerCase('vi')),
    ),
  );
  readonly typeLabels: Record<string, string> = {
    POST: 'Bài viết',
    POST_COMMENT: 'Bình luận',
    ROOM_REVIEW_TEXT: 'Đánh giá phòng',
    LANDLORD_REVIEW_TEXT: 'Đánh giá chủ trọ',
    ROOM_REVIEW_REPLY: 'Phản hồi đánh giá phòng',
    LANDLORD_REVIEW_REPLY: 'Phản hồi đánh giá chủ trọ',
  };
  ngOnInit() {
    this.load();
    this.loadRules();
  }
  load() {
    this.error.set('');
    this.api
      .cases(this.resolved, this.page)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.cases.set(r),
        error: (e) => this.error.set(e.error?.message || 'Không tải được hàng đợi kiểm duyệt.'),
      });
  }
  loadRules() {
    this.api
      .rules()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.rules.set(r),
        error: (e) => this.error.set(e.error?.message || 'Không tải được quy tắc.'),
      });
  }
  open(c: ModerationCase) {
    this.selected.set(c);
    this.reason = '';
    this.decision = 'VISIBLE';
  }
  decide() {
    const c = this.selected();
    if (!c || !this.reason.trim() || this.busy()) return;
    this.busy.set(true);
    this.api
      .decide(c.id, this.decision, this.reason, c.contentVersion)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.selected.set(null);
          this.notice.set('Đã lưu quyết định kiểm duyệt.');
          this.load();
        },
        error: (e) =>
          this.error.set(
            e.error?.message || 'Nội dung đã thay đổi. Vui lòng tải lại trước khi duyệt.',
          ),
      });
  }
  newRule() {
    this.draft.set({
      id: '',
      pattern: '',
      matchType: 'TOKEN',
      action: 'RESTRICT',
      accentInsensitive: false,
      applyPosts: true,
      applyComments: true,
      applyReviews: true,
      applyReplies: true,
      enabled: true,
      reason: 'Nội dung có cách diễn đạt không phù hợp.',
      version: 1,
    });
  }
  editRule(r: ModerationRule) {
    this.draft.set({ ...r });
  }
  saveRule() {
    const r = this.draft();
    if (!r || this.busy()) return;
    this.busy.set(true);
    this.api
      .saveRule(r)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.draft.set(null);
          this.loadRules();
          this.notice.set('Đã lưu quy tắc. Quy tắc áp dụng cho nội dung mới.');
        },
        error: (e) => this.error.set(e.error?.message || 'Không lưu được quy tắc.'),
      });
  }
  test() {
    this.api
      .test(this.testScope, this.testText)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.notice.set(this.labels[r.status] + (r.reason ? ' · ' + r.reason : '')),
        error: (e) => this.error.set(e.error?.message || 'Không thể thử quy tắc.'),
      });
  }
}
