import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '@services/auth/auth.service';
import { CommunityService } from '@services/community/community.service';
import { CommunityPost } from '@model/community/community.model';
import { PostCardComponent } from './post-card.component';

@Component({
  selector: 'app-community-feed',
  imports: [FormsModule, RouterLink, PostCardComponent],
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
  private cursor = '';
  private generation = 0;
  q = '';
  area = '';
  ngOnInit() {
    this.load(true);
  }
  select(tab: string) {
    this.tab.set(tab);
    this.load(true);
  }
  load(reset = false) {
    if (this.loading() && !reset) return;
    if (this.tab() === 'NEARBY' && !this.area.trim()) {
      this.error.set('Nhập khu vực bạn muốn tìm rồi bấm Tìm kiếm.');
      return;
    }
    const generation = ++this.generation;
    if (reset) {
      this.cursor = '';
      this.posts.set([]);
    }
    this.loading.set(true);
    this.error.set('');
    this.api
      .feed(this.tab(), this.cursor, this.q, this.tab() === 'NEARBY' ? this.area.trim() : '')
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (generation === this.generation) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          if (generation !== this.generation) return;
          this.posts.update((old) => (reset ? result.items : [...old, ...result.items]));
          this.cursor = result.nextCursor || '';
          this.hasMore.set(result.hasMore);
        },
        error: (e) => {
          if (generation === this.generation)
            this.error.set(e.error?.message ?? 'Không tải được bảng tin. Vui lòng thử lại.');
        },
      });
  }
}
