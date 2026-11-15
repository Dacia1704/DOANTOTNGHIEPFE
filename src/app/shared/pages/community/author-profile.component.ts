import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { NavigationStart, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { CommunityService } from '@services/community/community.service';
import { AuthService } from '@services/auth/auth.service';
import { CommunityAuthor, CommunityPost } from '@model/community/community.model';
import { PostCardComponent } from './post-card.component';

@Component({
  selector: 'app-community-author-profile',
  imports: [DatePipe, PostCardComponent],
  templateUrl: './author-profile.component.html',
  styleUrl: './author-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthorProfileComponent implements OnInit {
  readonly data = inject<{ authorId: string }>(DIALOG_DATA);
  readonly dialogRef = inject(DialogRef);
  readonly auth = inject(AuthService);
  private readonly api = inject(CommunityService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly profile = signal<CommunityAuthor | null>(null);
  readonly posts = signal<CommunityPost[]>([]);
  readonly profileLoading = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly postError = signal('');
  readonly hasMore = signal(false);
  private cursor = '';

  ngOnInit() {
    this.loadProfile();
    this.loadPosts();
    this.router.events.pipe(takeUntilDestroyed(this.destroy)).subscribe((event) => {
      if (event instanceof NavigationStart) this.dialogRef.close();
    });
  }
  loadProfile() {
    if (this.profileLoading()) return;
    this.profileLoading.set(true);
    this.error.set('');
    this.api
      .author(this.data.authorId)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.profileLoading.set(false)),
      )
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.posts.update((items) =>
            items.map((post) => ({ ...post, following: profile.following })),
          );
        },
        error: () => this.error.set('Không tải được hồ sơ. Tài khoản có thể không còn khả dụng.'),
      });
  }
  loadPosts() {
    if (this.loading()) return;
    this.loading.set(true);
    this.postError.set('');
    this.api
      .authorPosts(this.data.authorId, this.cursor)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.posts.update((items) => [
            ...items,
            ...result.items.filter((post) => !items.some((item) => item.id === post.id)),
          ]);
          this.cursor = result.nextCursor || '';
          this.hasMore.set(result.hasMore);
        },
        error: () => this.postError.set('Không tải được bài viết. Vui lòng thử lại.'),
      });
  }
  follow() {
    const profile = this.profile();
    if (!profile || this.busy()) return;
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/dang-nhap']);
      return;
    }
    this.busy.set(true);
    this.api
      .follow(profile.id, !profile.following)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.loadProfile();
          this.posts.update((items) =>
            items.map((post) => ({ ...post, following: !profile.following })),
          );
        },
        error: () => this.error.set('Không thể cập nhật theo dõi. Vui lòng thử lại.'),
      });
  }
  refreshPost(id: string) {
    this.api
      .post(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (post) => {
          this.posts.update((items) =>
            ['VISIBLE', 'RESTRICTED'].includes(post.status)
              ? items.map((item) => (item.id === id ? post : item))
              : items.filter((item) => item.id !== id),
          );
          this.loadProfile();
        },
        error: (e) => {
          if (e.status === 404 || e.status === 410) {
            this.posts.update((items) => items.filter((item) => item.id !== id));
            this.loadProfile();
          } else this.postError.set('Không thể cập nhật bài viết. Vui lòng thử lại.');
        },
      });
  }
}
