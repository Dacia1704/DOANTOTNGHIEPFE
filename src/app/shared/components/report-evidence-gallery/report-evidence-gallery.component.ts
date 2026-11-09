import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, Subscription } from 'rxjs';
import { ReportEvidence } from '@model/report/report.model';
import { ReportService } from '@services/report/report.service';
import { ReportImageUtils } from '@shared/utils/report-image-utils';
interface EvidenceImage {
  id: string;
  url: string;
  error: boolean;
}
interface UploadImage {
  file: File;
  url: string;
  status: 'ready' | 'uploading' | 'failed' | 'done';
  error: string;
  evidenceId?: string;
}
@Component({
  selector: 'app-report-evidence-gallery',
  templateUrl: './report-evidence-gallery.component.html',
  styleUrl: './report-evidence-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportEvidenceGalleryComponent {
  readonly reportId = input.required<string>();
  readonly evidences = input<ReportEvidence[]>([]);
  readonly writable = input(false);
  readonly changed = output<void>();
  readonly busyChange = output<boolean>();
  readonly images = signal<EvidenceImage[]>([]);
  readonly uploads = signal<UploadImage[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly api = inject(ReportService);
  private readonly destroy = inject(DestroyRef);
  private downloads: Subscription[] = [];
  private currentId = '';
  private dead = false;
  constructor() {
    effect(() => {
      const id = this.reportId(),
        evidences = this.evidences();
      untracked(() => {
        this.clearDownloads();
        if (id !== this.currentId) {
          this.uploads().forEach((u) => URL.revokeObjectURL(u.url));
          this.uploads.set([]);
          this.currentId = id;
        }
        this.images.set(evidences.map((e) => ({ id: e.id, url: '', error: false })));
        for (const evidence of evidences) this.download(evidence.id);
      });
    });
    this.destroy.onDestroy(() => {
      this.dead = true;
      this.clearDownloads();
      this.uploads().forEach((u) => URL.revokeObjectURL(u.url));
    });
  }
  count() {
    return (
      this.evidences().length +
      this.uploads().filter(
        (u) => !u.evidenceId || !this.evidences().some((e) => e.id === u.evidenceId),
      ).length
    );
  }
  visibleUploads() {
    return this.uploads().filter(
      (u) => !u.evidenceId || !this.evidences().some((e) => e.id === u.evidenceId),
    );
  }
  download(evidenceId: string) {
    this.images.update((items) =>
      items.map((i) => (i.id === evidenceId ? { ...i, error: false } : i)),
    );
    this.downloads.push(
      this.api.content(this.reportId(), evidenceId).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.images.update((items) =>
            items.map((i) => (i.id === evidenceId ? { ...i, url, error: false } : i)),
          );
        },
        error: () =>
          this.images.update((items) =>
            items.map((i) => (i.id === evidenceId ? { ...i, error: true } : i)),
          ),
      }),
    );
  }
  async select(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || this.busy() || !this.writable()) return;
    if (this.count() + files.length > 5) {
      this.error.set('Mỗi báo cáo có tối đa 5 ảnh minh chứng.');
      return;
    }
    this.setBusy(true);
    this.error.set('');
    const id = this.reportId();
    try {
      // Validate the whole selection before sending any file.
      for (const file of files) await ReportImageUtils.validate(file);
      if (this.dead || this.reportId() !== id || !this.writable()) return;
      const rows: UploadImage[] = files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        status: 'ready',
        error: '',
      }));
      this.uploads.update((items) => [...items, ...rows]);
      for (const row of rows) {
        if (this.dead || this.reportId() !== id || !this.writable()) break;
        // Stop the batch on failure; remaining images can be retried individually.
        if (!(await this.send(row, id))) break;
      }
    } catch (e) {
      if (!this.dead) this.error.set(e instanceof Error ? e.message : 'Chưa tải được ảnh.');
    } finally {
      if (!this.dead) this.setBusy(false);
    }
  }
  async retry(row: UploadImage) {
    if (this.busy() || !this.writable() || this.evidences().length >= 5) return;
    this.setBusy(true);
    try {
      await this.send(row, this.reportId());
    } finally {
      if (!this.dead) this.setBusy(false);
    }
  }
  remove(row: UploadImage) {
    if (this.busy() || row.status === 'done') return;
    URL.revokeObjectURL(row.url);
    this.uploads.update((items) => items.filter((i) => i !== row));
  }
  private async send(row: UploadImage, id: string): Promise<boolean> {
    row.status = 'uploading';
    row.error = '';
    this.uploads.update((items) => [...items]);
    try {
      const evidence = await firstValueFrom(
        this.api.upload(id, row.file).pipe(takeUntilDestroyed(this.destroy)),
      );
      if (this.dead || id !== this.reportId()) return false;
      row.status = 'done';
      row.evidenceId = evidence.id;
      this.uploads.update((items) => [...items]);
      this.changed.emit();
      return true;
    } catch (e: any) {
      if (this.dead || id !== this.reportId()) return false;
      row.status = 'failed';
      row.error = e.error?.message || 'Ảnh chưa được tải lên. Bạn có thể thử lại.';
      this.uploads.update((items) => [...items]);
      this.changed.emit();
      return false;
    }
  }
  private setBusy(value: boolean) {
    this.busy.set(value);
    this.busyChange.emit(value);
  }
  private clearDownloads() {
    this.downloads.forEach((s) => s.unsubscribe());
    this.downloads = [];
    this.images().forEach((i) => {
      if (i.url) URL.revokeObjectURL(i.url);
    });
  }
}
