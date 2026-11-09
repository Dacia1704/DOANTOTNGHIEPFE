import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import {
  ReportDetail,
  ReportReason,
  ReportTargetType,
  REPORT_REASONS,
  REPORT_TARGETS,
} from '@model/report/report.model';
import { ReportService } from '@services/report/report.service';
import { ReportEvidenceGalleryComponent } from '../report-evidence-gallery/report-evidence-gallery.component';
export interface ReportDialogData {
  targetType: ReportTargetType;
  targetId: string;
  targetName: string;
}
@Component({
  selector: 'app-report-form-dialog',
  imports: [FormsModule, ReportEvidenceGalleryComponent],
  templateUrl: './report-form-dialog.component.html',
  styleUrl: './report-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportFormDialogComponent {
  readonly data = inject<ReportDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ReportFormDialogComponent>);
  private readonly api = inject(ReportService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly reasons = signal<ReportReason[]>([]);
  readonly detail = signal<ReportDetail | null>(null);
  readonly busy = signal(false);
  readonly uploading = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly reasonLabels = REPORT_REASONS;
  readonly targets = REPORT_TARGETS;
  reason: ReportReason | '' = '';
  description = '';
  constructor() {
    this.loadReasons();
  }
  loadReasons() {
    this.loading.set(true);
    this.error.set('');
    this.api
      .reasons(this.data.targetType)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (r) => this.reasons.set(r),
        error: (e) => this.error.set(e.error?.message || 'Chưa tải được lý do báo cáo.'),
      });
  }
  get valid() {
    return (
      this.reasons().includes(this.reason as ReportReason) &&
      this.description.length <= 5000 &&
      (this.reason !== 'OTHER' || !!this.description.trim())
    );
  }
  submit() {
    if (this.busy() || !this.valid || this.detail()) return;
    this.busy.set(true);
    this.ref.disableClose = true;
    this.error.set('');
    this.api
      .create({
        targetType: this.data.targetType,
        targetId: this.data.targetId,
        reasonCode: this.reason as ReportReason,
        description: this.description.trim(),
      })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: (report) => this.detail.set({ report, evidences: [] }),
        error: (e) =>
          this.error.set(e.error?.message || 'Chưa gửi được báo cáo. Vui lòng thử lại.'),
      });
  }
  refresh() {
    const id = this.detail()?.report.id;
    if (!id) return;
    this.api
      .detail(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => this.detail.set(r),
        error: () =>
          this.error.set(
            'Báo cáo đã gửi. Chưa cập nhật được ảnh; mở chi tiết để kiểm tra trước khi thử lại.',
          ),
      });
  }
  uploadState(value: boolean) {
    this.uploading.set(value);
    this.ref.disableClose = value;
  }
  view() {
    if (this.busy() || this.uploading()) return;
    const id = this.detail()?.report.id;
    this.ref.close();
    this.router.navigate(id ? ['/bao-cao-cua-toi', id] : ['/bao-cao-cua-toi']);
  }
  close() {
    if (!this.busy() && !this.uploading()) this.ref.close();
  }
}
