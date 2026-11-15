import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { LandlordDashboard } from '@model/dashboard/landlord-dashboard.model';
import { LandlordDashboardService } from '@services/dashboard/landlord-dashboard.service';
import {
  DashboardChartComponent,
  ChartSeries,
} from '@shared/components/dashboard-chart/dashboard-chart.component';
import { ChartRevealDirective } from '@shared/components/dashboard-chart/chart-reveal.directive';
import { TextUtils } from '@shared/utils/text-utils';

@Component({
  selector: 'app-landlord-dashboard',
  imports: [DatePipe, RouterLink, FormsModule, DashboardChartComponent, ChartRevealDirective],
  templateUrl: './landlord-dashboard.component.html',
  styleUrl: './landlord-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandlordDashboardComponent {
  private readonly api = inject(LandlordDashboardService);
  private readonly requests = new Subject<{ from: string; to: string }>();
  readonly data = signal<LandlordDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly validation = signal('');
  readonly preset = signal(7);
  readonly presets = [
    { days: 1, label: 'Hôm nay' },
    { days: 7, label: '7 ngày' },
    { days: 30, label: '30 ngày' },
    { days: 0, label: 'Tùy chỉnh' },
  ];
  readonly today = this.dateKey(new Date());
  from = this.daysAgo(6);
  to = this.today;
  readonly requestSeries: ChartSeries[] = [
    { key: 'requests', label: 'Yêu cầu thuê mới', color: 'var(--primary)' },
  ];
  readonly interestSeries: ChartSeries[] = [
    { key: 'views', label: 'Lượt xem', color: 'var(--primary)' },
    { key: 'contacts', label: 'Xem số điện thoại', color: 'var(--secondary-light)' },
  ];
  readonly spendSeries: ChartSeries[] = [
    { key: 'serviceSpend', label: 'Gói dịch vụ', color: 'var(--primary)' },
    { key: 'boostSpend', label: 'Boost', color: 'var(--secondary-light)' },
  ];
  readonly rooms = computed(() =>
    [
      { key: 'RENTED', label: 'Đã cho thuê', color: 'var(--primary)' },
      { key: 'AVAILABLE', label: 'Còn trống', color: 'var(--success)' },
      { key: 'HELD', label: 'Đang giữ chỗ', color: 'var(--secondary-light)' },
      { key: 'MAINTENANCE', label: 'Bảo trì', color: 'var(--outline-variant)' },
    ].map((s) => ({ ...s, value: this.data()?.roomStatuses[s.key] || 0 })),
  );
  readonly statuses = computed(() =>
    [
      { key: 'PUBLISHED', label: 'Đang hiển thị', color: 'var(--primary)' },
      { key: 'PENDING', label: 'Chờ duyệt', color: 'var(--secondary-light)' },
      { key: 'HIDDEN', label: 'Đã ẩn', color: 'var(--info)' },
      { key: 'EXPIRED', label: 'Hết hạn', color: 'var(--outline-variant)' },
      { key: 'REJECTED', label: 'Bị từ chối', color: 'var(--error)' },
    ].map((s) => ({ ...s, value: this.data()?.listingStatuses[s.key] || 0 })),
  );
  readonly listingTotal = computed(() => this.statuses().reduce((n, s) => n + s.value, 0));
  readonly occupancy = computed(() => this.share(this.room('RENTED'), this.current('rooms')));
  readonly acceptance = computed(() =>
    this.share(this.period('acceptedRequests'), this.period('requests')),
  );
  readonly conversion = computed(() => this.share(this.period('contacts'), this.period('views')));
  readonly donut = computed(() => {
    const total = this.current('rooms');
    if (!total) return 'var(--border)';
    let progress = 0;
    return `conic-gradient(${this.rooms()
      .map((s) => {
        const start = progress;
        progress += this.share(s.value, total);
        return `${s.color} ${start}% ${progress}%`;
      })
      .join(',')})`;
  });
  readonly packageUsage = computed(() => {
    const p = this.data()?.servicePackage;
    return p?.maxListings ? Math.min(100, this.share(p.usedListings, p.maxListings)) : 0;
  });
  readonly primaryCards = computed(() => [
    {
      label: 'Tổng phòng / căn',
      value: this.current('rooms'),
      icon: 'apartment',
      scope: 'Hiện tại',
      note: `${this.format(this.current('properties'))} cơ sở cho thuê`,
    },
    {
      label: 'Phòng / căn còn trống',
      value: this.room('AVAILABLE'),
      icon: 'door_open',
      scope: 'Hiện tại',
      note: `Tỷ lệ lấp đầy: ${this.percent(this.occupancy())}`,
    },
    {
      label: 'Hợp đồng hiệu lực',
      value: this.current('activeAgreements'),
      icon: 'verified',
      scope: 'Hiện tại',
      note: 'Đã xác nhận, đang trong thời hạn thuê',
    },
    {
      label: 'Yêu cầu thuê mới',
      value: this.period('requests'),
      icon: 'mark_email_unread',
      scope: 'Trong kỳ',
      note: `Đã phản hồi: ${this.format(this.period('respondedRequests'))}`,
      change: this.change('requests'),
    },
  ]);
  readonly contractCards = computed(() => [
    {
      label: 'Mới được xác nhận',
      value: this.period('confirmedAgreements'),
      scope: 'Trong kỳ',
      icon: 'check_circle',
      note: this.change('confirmedAgreements') + ' so với kỳ trước',
    },
    {
      label: 'Đang chờ xác nhận',
      value: this.current('pendingAgreements'),
      scope: 'Hiện tại',
      icon: 'hourglass_top',
      note: 'Gồm bản nháp và hợp đồng chờ hai bên xác nhận',
    },
    {
      label: 'Sắp hết hạn',
      value: this.current('endingAgreements'),
      scope: '30 ngày tới',
      icon: 'event_repeat',
      note: 'Hợp đồng đang hoạt động, gần ngày kết thúc',
    },
    {
      label: 'Đã kết thúc đúng hạn',
      value: this.period('endedAgreements'),
      scope: 'Trong kỳ',
      icon: 'task_alt',
      note: 'Hợp đồng có trạng thái hết hạn',
    },
  ]);

  constructor() {
    this.requests
      .pipe(
        switchMap((range) => {
          this.loading.set(true);
          this.error.set('');
          this.data.set(null);
          return this.api.overview(range.from, range.to).pipe(
            catchError(() => {
              this.error.set('Không thể tải số liệu cho thuê. Vui lòng thử lại.');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        this.data.set(data);
        this.loading.set(false);
      });
    this.reload();
  }
  selectPreset(days: number) {
    this.preset.set(days);
    this.validation.set('');
    if (!days) return;
    this.to = this.today;
    this.from = this.daysAgo(days - 1);
    this.reload();
  }
  reload() {
    const start = Date.parse(this.from),
      end = Date.parse(this.to);
    const valid = (s: string, n: number) =>
      Number.isFinite(n) &&
      /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      new Date(n).toISOString().slice(0, 10) === s;
    if (
      !valid(this.from, start) ||
      !valid(this.to, end) ||
      start > end ||
      this.to > this.today ||
      end - start >= 366 * 86400000
    ) {
      this.validation.set('Chọn từ 1 đến 366 ngày, ngày kết thúc không vượt quá hôm nay.');
      return;
    }
    this.validation.set('');
    this.requests.next({ from: this.from, to: this.to });
  }
  current(key: string) {
    return this.data()?.current[key] || 0;
  }
  period(key: string) {
    return this.data()?.period[key] || 0;
  }
  room(key: string) {
    return this.data()?.roomStatuses[key] || 0;
  }
  listing(key: string) {
    return this.data()?.listingStatuses[key] || 0;
  }
  share(value: number, total: number) {
    return total > 0 ? (value / total) * 100 : 0;
  }
  format(value: number, money = false) {
    return money ? TextUtils.toVnd(value, '₫') : value.toLocaleString('vi-VN');
  }
  percent(value: number) {
    return value.toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
  }
  change(key: string) {
    const previous = this.data()?.previous[key] || 0,
      value = this.period(key);
    if (!previous) return value ? 'Mới phát sinh' : '0%';
    const delta = ((value - previous) / previous) * 100;
    return (delta > 0 ? '+' : '') + this.percent(delta);
  }
  private daysAgo(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return this.dateKey(d);
  }
  private dateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
