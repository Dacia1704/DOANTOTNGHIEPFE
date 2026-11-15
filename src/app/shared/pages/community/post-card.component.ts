import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { CommunityService } from '@services/community/community.service';
import { AuthService } from '@services/auth/auth.service';
import { CommunityPost, Reaction, moderationLabels } from '@model/community/community.model';

@Component({
  selector: 'app-community-post-card',
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCardComponent {
  readonly post = input.required<CommunityPost>();
  readonly changed = output<void>();
  readonly auth = inject(AuthService);
  private readonly service = inject(CommunityService);
  private readonly destroy = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly reportOpen = signal(false);
  readonly revealed = signal('');
  readonly labels = moderationLabels;
  reason = '';
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
    this.run(this.service.bookmark(this.post().id, !this.post().saved));
  }
  follow() {
    this.run(this.service.follow(this.post().authorId, !this.post().following));
  }
  pin() { this.run(this.service.pin(this.post().id, !this.post().pinned)); }
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
