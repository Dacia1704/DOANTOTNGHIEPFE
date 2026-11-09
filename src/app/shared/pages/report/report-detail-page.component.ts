import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { RoleCode } from '@model/auth/auth.model';
import {
  ReportDetail,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGETS,
} from '@model/report/report.model';
import { AuthService } from '@services/auth/auth.service';
import { ReportService } from '@services/report/report.service';
import { ReportEvidenceGalleryComponent } from '@shared/components/report-evidence-gallery/report-evidence-gallery.component';
@Component({
  selector: 'app-report-detail-page',
  imports: [DatePipe, FormsModule, RouterLink, ReportEvidenceGalleryComponent],
  templateUrl: './report-detail-page.component.html',
  styleUrl: './report-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDetailPageComponent {
  readonly auth = inject(AuthService);
  readonly admin = this.auth.hasAnyRole([RoleCode.ADMIN]);
  readonly baseLink = this.admin ? '/admin/reports' : '/bao-cao-cua-toi';
  readonly statuses = REPORT_STATUSES;
  readonly reasons = REPORT_REASONS;
  readonly targets = REPORT_TARGETS;
  readonly detail = signal<ReportDetail | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly uploading = signal(false);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly success = signal('');
  note = '';
  private readonly api = inject(ReportService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  private id = '';
  readonly backParams = this.route.snapshot.queryParams;
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((p) => {
      this.id = p.get('id') ?? '';
      this.detail.set(null);
      this.note = '';
      this.success.set('');
      this.actionError.set('');
      this.load();
    });
    this.destroy.onDestroy(() => this.request?.unsubscribe());
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .detail(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.detail.set(r),
        error: (e) =>
          this.error.set(e.error?.message || 'Chưa tải được báo cáo. Vui lòng thử lại.'),
      });
  }
  get canClose() {
    const r = this.detail()?.report;
    return this.admin && r?.status === 'PROCESSING' && r.handledBy === this.auth.session()?.id;
  }
  action(action: 'assign' | 'resolve' | 'reject') {
    if (
      !this.admin ||
      this.busy() ||
      this.loading() ||
      (action !== 'assign' && (!this.canClose || !this.note.trim() || this.note.length > 5000))
    )
      return;
    if (action === 'assign' && this.detail()?.report.status !== 'PENDING') return;
    const id = this.id;
    this.busy.set(true);
    this.actionError.set('');
    this.success.set('');
    this.api
      .action(id, action, this.note.trim())
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          if (id !== this.id) return;
          this.note = '';
          this.success.set(
            action === 'assign' ? 'Bạn đã nhận xử lý báo cáo.' : 'Đã lưu kết quả xử lý báo cáo.',
          );
          this.load();
        },
        error: (e) => {
          if (id !== this.id) return;
          this.actionError.set(
            e.error?.message ||
              'Không thể thực hiện. Báo cáo có thể đã được cập nhật bởi quản trị viên khác.',
          );
          this.load();
        },
      });
  }
}
