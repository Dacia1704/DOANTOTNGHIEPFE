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
import { ReportSanctionOptionsResponse } from '@model/report/response/report-response';
import { AuthService } from '@services/auth/auth.service';
import { ReportService } from '@services/report/report.service';
import { ReportEvidenceGalleryComponent } from '@shared/components/report-evidence-gallery/report-evidence-gallery.component';
import { ReportListingPreviewComponent } from '@shared/components/report-listing-preview/report-listing-preview.component';
@Component({
  selector: 'app-report-detail-page',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ReportEvidenceGalleryComponent,
    ReportListingPreviewComponent,
  ],
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
  relatedListingId = '';
  readonly sanctionOptions = signal<ReportSanctionOptionsResponse | null>(null);
  readonly sanctionLoading = signal(false);
  private sanctionRequest?: Subscription;
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
    this.destroy.onDestroy(() => {
      this.request?.unsubscribe();
      this.sanctionRequest?.unsubscribe();
    });
  }
  load() {
    this.request?.unsubscribe();
    this.sanctionRequest?.unsubscribe();
    this.sanctionOptions.set(null);
    this.relatedListingId = '';
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .detail(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => {
          this.detail.set(r);
          if (this.canClose) this.loadSanctionOptions();
        },
        error: (e) =>
          this.error.set(e.error?.message || 'Chưa tải được báo cáo. Vui lòng thử lại.'),
      });
  }
  get canClose() {
    const r = this.detail()?.report;
    return this.admin && r?.status === 'PROCESSING' && r.handledBy === this.auth.session()?.id;
  }
  get needsRelatedListing() {
    return (
      this.detail()?.report.targetType === 'LANDLORD' &&
      !this.originListingId &&
      this.sanctionOptions()?.nextWarningLevel === 2
    );
  }
  get originListingId(): string | null {
    const detail = this.detail();
    return (
      detail?.originListing?.id ||
      detail?.report.originListingId ||
      (detail?.report.targetType === 'LISTING' ? detail.report.targetId : null)
    );
  }
  get selectedRelatedListing() {
    return this.sanctionOptions()?.listings.find((listing) => listing.id === this.relatedListingId);
  }
  readonly listingStatuses: Record<string, string> = {
    DRAFT: 'Bản nháp',
    PENDING: 'Chờ duyệt',
    PUBLISHED: 'Đang hiển thị',
    REJECTED: 'Bị từ chối',
    HIDDEN: 'Đã ẩn',
    EXPIRED: 'Hết hạn',
  };
  get canApprove() {
    return (
      !this.sanctionLoading() &&
      !!this.sanctionOptions() &&
      (!this.needsRelatedListing ||
        !!this.sanctionOptions()?.listings.some((listing) => listing.id === this.relatedListingId))
    );
  }
  loadSanctionOptions() {
    this.sanctionRequest?.unsubscribe();
    this.sanctionOptions.set(null);
    this.sanctionLoading.set(true);
    const id = this.id;
    this.sanctionRequest = this.api
      .sanctionOptions(id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.sanctionLoading.set(false)),
      )
      .subscribe({
        next: (value) => {
          if (id === this.id) this.sanctionOptions.set(value);
        },
        error: (e) => {
          if (id === this.id)
            this.actionError.set(e.error?.message || 'Chưa tải được mức xử lý. Vui lòng thử lại.');
        },
      });
  }
  action(action: 'assign' | 'resolve' | 'reject') {
    if (
      !this.admin ||
      this.busy() ||
      this.loading() ||
      (action !== 'assign' && (!this.canClose || !this.note.trim() || this.note.length > 5000))
    )
      return;
    if (action === 'resolve' && !this.canApprove) {
      this.actionError.set('Vui lòng tải mức xử lý và chọn tin đăng liên quan nếu được yêu cầu.');
      return;
    }
    if (action === 'assign' && this.detail()?.report.status !== 'PENDING') return;
    const id = this.id;
    this.busy.set(true);
    this.actionError.set('');
    this.success.set('');
    this.api
      .action(
        id,
        action,
        this.note.trim(),
        action === 'resolve' && this.needsRelatedListing
          ? this.relatedListingId || undefined
          : undefined,
      )
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
