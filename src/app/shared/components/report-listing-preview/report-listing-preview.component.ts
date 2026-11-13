import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReportListing } from '@model/report/report.model';
import { ReportService } from '@services/report/report.service';

@Component({
  selector: 'app-report-listing-preview',
  imports: [DatePipe, RouterLink],
  templateUrl: './report-listing-preview.component.html',
  styleUrl: './report-listing-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportListingPreviewComponent {
  readonly listingId = input.required<string>();
  readonly reportId = input('');
  readonly context = input<ReportListing | null>(null);
  readonly title = input('');
  readonly status = input('');
  readonly listing = signal<ReportListing | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly statuses: Record<string, string> = {
    DRAFT: 'Bản nháp',
    PENDING: 'Chờ duyệt',
    PUBLISHED: 'Đang hiển thị',
    REJECTED: 'Bị từ chối',
    HIDDEN: 'Đã ẩn',
    EXPIRED: 'Hết hạn',
  };
  private readonly api = inject(ReportService);
  readonly retry = signal(0);

  reload(): void {
    this.retry.update((value) => value + 1);
  }

  constructor() {
    effect((onCleanup) => {
      const id = this.listingId();
      const reportId = this.reportId();
      const context = this.context();
      this.retry();
      this.listing.set(null);
      this.error.set('');
      this.loading.set(false);
      if (context?.id === id) {
        this.listing.set(context);
        return;
      }
      if (!reportId) return;
      this.loading.set(true);
      const request = this.api.listingDetail(reportId, id).subscribe({
        next: (listing) => {
          this.listing.set(listing);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Chưa tải được chi tiết tin đăng trong báo cáo. Vui lòng thử lại.');
          this.loading.set(false);
        },
      });
      onCleanup(() => request.unsubscribe());
    });
  }
}
