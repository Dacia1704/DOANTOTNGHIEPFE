import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, from, concatMap, toArray } from 'rxjs';
import { AuthService } from '@services/auth/auth.service';
import { CommunityService } from '@services/community/community.service';
import {
  CommunityMedia,
  CommunityListing,
  moderationLabels,
} from '@model/community/community.model';

@Component({
  selector: 'app-post-composer',
  imports: [FormsModule, RouterLink],
  templateUrl: './post-composer.component.html',
  styleUrl: './post-composer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostComposerComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(CommunityService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  readonly media = signal<CommunityMedia[]>([]);
  readonly links = signal<{ id: string; title: string }[]>([]);
  readonly choices = signal<CommunityListing[]>([]);
  readonly busy = signal(false);
  readonly uploading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly labels = moderationLabels;
  content = '';
  area = '';
  listingQuery = '';
  private id?: string;
  private version?: number;
  get length() {
    return Array.from(this.content).length;
  }
  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('edit');
    if (id)
      this.api
        .post(id)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (p) => {
            if (p.authorId !== this.auth.session()?.id) {
              this.error.set('Bạn không thể sửa bài của người khác.');
              return;
            }
            this.id = p.id;
            this.version = p.version;
            this.content = p.content || '';
            this.area = p.area;
            this.media.set(p.media);
            this.links.set(p.listings);
          },
          error: () => this.error.set('Không tải được bài viết.'),
        });
  }
  upload(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files || []);
    (event.target as HTMLInputElement).value = '';
    if (!files.length) return;
    if (files.length + this.media().length > 10 || files.some((f) => f.size > 5 * 1024 * 1024)) {
      this.error.set('Tối đa 10 ảnh, mỗi ảnh không quá 5MB.');
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    from(files)
      .pipe(
        concatMap((file) => this.api.upload(file)),
        toArray(),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.uploading.set(false)),
      )
      .subscribe({
        next: (items) => this.media.update((old) => [...old, ...items]),
        error: (e) => this.error.set(e.error?.message || 'Tải ảnh thất bại, vui lòng thử lại.'),
      });
  }
  removeMedia(id: string) {
    this.media.update((items) => items.filter((x) => x.id !== id));
  }
  searchListings() {
    this.api
      .listingChoices(this.listingQuery)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.choices.set(r),
        error: () => this.error.set('Không tải được danh sách tin phòng.'),
      });
  }
  attach(listing: CommunityListing) {
    if (this.links().length >= 3 || this.links().some((l) => l.id === listing.id)) return;
    this.links.update((old) => [...old, { id: listing.id, title: listing.title }]);
  }
  unlink(id: string) {
    this.links.update((old) => old.filter((x) => x.id !== id));
  }
  submit() {
    if (this.busy() || this.uploading() || this.length > 5000) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .savePost(
        {
          content: this.content,
          area: this.area,
          mediaIds: this.media().map((m) => m.id),
          listingIds: this.links().map((l) => l.id),
          expectedVersion: this.version,
        },
        this.id,
      )
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (p) => {
          if (p.status === 'VISIBLE') void this.router.navigate(['/community/posts', p.id]);
          else {
            this.id = p.id;
            this.version = p.version;
            this.success.set('Đã lưu bài viết · ' + this.labels[p.status]);
          }
        },
        error: (e) =>
          this.error.set(
            e.error?.message || 'Không thể đăng bài. Bản nháp của bạn vẫn được giữ lại.',
          ),
      });
  }
}
