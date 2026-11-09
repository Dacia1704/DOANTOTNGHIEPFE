import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { RoleCode } from '@model/auth/auth.model';
import {
  Report,
  ReportStatus,
  ReportReason,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGETS,
} from '@model/report/report.model';
import { AuthService } from '@services/auth/auth.service';
import { ReportService } from '@services/report/report.service';
import {
  ManagementTableComponent,
  ManagementTableColumn,
} from '@shared/components/management-table/management-table.component';
import { ManagementTableCellDirective } from '@shared/components/management-table/management-table-cell.directive';
@Component({
  selector: 'app-report-list-page',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ManagementTableComponent,
    ManagementTableCellDirective,
  ],
  templateUrl: './report-list-page.component.html',
  styleUrl: './report-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportListPageComponent {
  readonly admin = inject(AuthService).hasAnyRole([RoleCode.ADMIN]);
  readonly baseLink = this.admin ? '/admin/reports' : '/bao-cao-cua-toi';
  readonly statuses = REPORT_STATUSES;
  readonly reasons = REPORT_REASONS;
  readonly targets = REPORT_TARGETS;
  readonly statusKeys = Object.keys(REPORT_STATUSES) as ReportStatus[];
  readonly reasonKeys = Object.keys(REPORT_REASONS) as ReportReason[];
  readonly summary = signal<Record<ReportStatus, number> | null>(null);
  readonly summaryError = signal('');
  readonly status = signal('');
  readonly reason = signal('');
  readonly items = signal<Report[]>([]);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly rowKey = (r: Report) => r.id;
  readonly columns: ManagementTableColumn<Report>[] = [
    { key: 'target', label: 'Đối tượng báo cáo' },
    { key: 'reason', label: 'Lý do' },
    { key: 'status', label: 'Trạng thái' },
    ...(this.admin ? [{ key: 'handler', label: 'Người xử lý' }] : []),
    { key: 'createdAt', label: 'Ngày gửi' },
    { key: 'action', label: 'Thao tác', align: 'right' },
  ];
  private readonly api = inject(ReportService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  private summaryRequest?: Subscription;
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((q) => {
      const status = q.get('status') ?? '',
        reason = q.get('reasonCode') ?? '';
      this.status.set(this.statusKeys.includes(status as ReportStatus) ? status : '');
      this.reason.set(this.reasonKeys.includes(reason as ReportReason) ? reason : '');
      this.page.set(Math.max(0, Math.floor(Number(q.get('page')) || 0)));
      this.load();
    });
    this.destroy.onDestroy(() => {
      this.request?.unsubscribe();
      this.summaryRequest?.unsubscribe();
    });
  }
  filter(status = this.status(), reason = this.reason(), page = 0) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: status || null, reasonCode: reason || null, page },
      queryParamsHandling: 'merge',
    });
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.items.set([]);
    this.request = this.api
      .list(this.admin, this.page(), this.size(), this.status(), this.reason())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => {
          this.items.set(r.data);
          this.total.set(r.totalElements);
          this.totalPages.set(r.totalPages);
        },
        error: (e) =>
          this.error.set(e.error?.message || 'Chưa tải được danh sách báo cáo. Vui lòng thử lại.'),
      });
    if (this.admin) this.loadSummary();
  }
  loadSummary() {
    this.summaryRequest?.unsubscribe();
    this.summaryError.set('');
    this.summaryRequest = this.api.summary().subscribe({
      next: (r) => this.summary.set(r),
      error: () => this.summaryError.set('Chưa tải được số lượng theo trạng thái.'),
    });
  }
  changeSize(size: number) {
    this.size.set(size);
    if (this.page() === 0) this.load();
    else this.filter(this.status(), this.reason(), 0);
  }
}
