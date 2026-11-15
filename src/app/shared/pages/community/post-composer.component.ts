import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
  input,
  output,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '@services/auth/auth.service';
import { CommunityService } from '@services/community/community.service';
import {
  CommunityMedia,
  CommunityListing,
  CommunityPost,
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
  readonly compact = input(false);
  readonly posted = output<CommunityPost>();
  readonly advanced = output<void>();
  readonly auth = inject(AuthService);
  private readonly api = inject(CommunityService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  readonly media = signal<CommunityMedia[]>([]);
  readonly pendingMedia = signal<{ id: string; url: string; file: File }[]>([]);
  readonly allMedia = computed(() => [...this.media(), ...this.pendingMedia()]);
  readonly links = signal<{ id: string; title: string }[]>([]);
  readonly choices = signal<CommunityListing[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly labels = moderationLabels;
  content = '';
  area = '';
  listingQuery = '';
  private id?: string;
  private version?: number;
  constructor() {
    this.destroy.onDestroy(() => this.clearPendingMedia());
  }
  get length() {
    return Array.from(this.content).length;
  }
  ngOnInit() {
    if (!this.compact()) {
      const draft =
        this.router.currentNavigation()?.extras.state?.['communityDraft'] ??
        history.state?.communityDraft;
      if (draft) {
        this.content = draft.content || '';
        this.area = draft.area || '';
        this.media.set(draft.media || []);
        this.links.set(draft.links || []);
        this.addFiles(draft.files || []);
      }
    }
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
  openAdvanced() {
    if (this.busy()) return;
    const communityDraft = {
      content: this.content,
      area: this.area,
      media: this.media(),
      links: this.links(),
      files: this.pendingMedia().map((image) => image.file),
    };
    this.advanced.emit();
    void this.router.navigate(['/community/create'], {
      state: { communityDraft },
    });
  }
  upload(event: Event) {
    if (this.busy()) return;
    const files = Array.from((event.target as HTMLInputElement).files || []);
    (event.target as HTMLInputElement).value = '';
    if (!files.length) return;
    this.addFiles(files);
  }
  private addFiles(files: File[]) {
    if (
      files.length + this.allMedia().length > 10 ||
      files.some((f) => f.size > 10 * 1024 * 1024)
    ) {
      this.error.set('Tối đa 10 ảnh, mỗi ảnh không quá 10MB.');
      return;
    }
    if (files.some((file) => !['image/jpeg', 'image/png'].includes(file.type))) {
      this.error.set('Vui lòng chọn ảnh JPEG hoặc PNG.');
      return;
    }
    this.error.set('');
    this.pendingMedia.update((items) => [
      ...items,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        file,
      })),
    ]);
  }
  private clearPendingMedia() {
    for (const image of this.pendingMedia()) URL.revokeObjectURL(image.url);
    this.pendingMedia.set([]);
  }
  removeMedia(id: string) {
    if (this.busy()) return;
    const pending = this.pendingMedia().find((image) => image.id === id);
    if (pending) URL.revokeObjectURL(pending.url);
    this.pendingMedia.update((items) => items.filter((image) => image.id !== id));
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
    if (
      this.busy() ||
      this.length > 5000 ||
      (!this.content.trim() && !this.allMedia().length && !this.links().length)
    )
      return;
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
        this.pendingMedia().map((image) => image.file),
      )
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (p) => {
          this.clearPendingMedia();
          this.media.set(p.media);
          if (this.compact()) {
            this.posted.emit(p);
            return;
          }
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
