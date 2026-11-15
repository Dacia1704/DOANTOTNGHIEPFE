import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommunityService } from '@services/community/community.service';
import { CommunityPost } from '@model/community/community.model';
import { PostCardComponent } from './post-card.component';
import { CommunityCommentsComponent } from './community-comments.component';
@Component({
  selector: 'app-post-detail',
  imports: [RouterLink, PostCardComponent, CommunityCommentsComponent],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailComponent implements OnInit {
  private readonly api = inject(CommunityService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  readonly post = signal<CommunityPost | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  ngOnInit() {
    this.load();
  }
  load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.api
      .post(this.route.snapshot.paramMap.get('id')!)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (p) => {
          this.post.set(p);
          this.loading.set(false);
        },
        error: (e) => {
          this.post.set(null);
          this.error.set(e.error?.message || 'Bài viết không còn khả dụng.');
          this.loading.set(false);
        },
      });
  }
}
