import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { AdminDashboard } from '@model/dashboard/admin-dashboard.model';
import { TextUtils } from '@shared/utils/text-utils';
import { AdminDashboardService } from '@services/dashboard/admin-dashboard.service';
import {
  DashboardChartComponent,
  ChartSeries,
} from '@shared/components/dashboard-chart/dashboard-chart.component';
import { ChartRevealDirective } from '@shared/components/dashboard-chart/chart-reveal.directive';

interface MetricCard {
  label: string;
  value: number;
  icon: string;
  scope: string;
  note: string;
  change?: string;
  direction?: string;
  money?: boolean;
  warning?: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [DatePipe, FormsModule, NgTemplateOutlet, DashboardChartComponent, ChartRevealDirective],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly api = inject(AdminDashboardService);
  private readonly requests = new Subject<{ from: string; to: string }>();
  readonly data = signal<AdminDashboard | null>(null);
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
  readonly revenueSeries: ChartSeries[] = [
    { key: 'serviceRevenue', label: 'Gói dịch vụ', color: 'var(--primary)' },
    { key: 'boostRevenue', label: 'Boost đẩy tin', color: 'var(--secondary-light)' },
  ];
  readonly userSeries: ChartSeries[] = [
    { key: 'newTenants', label: 'Người thuê mới', color: 'var(--primary)' },
    { key: 'newLandlords', label: 'Chủ trọ mới', color: 'var(--info)' },
  ];
  readonly communitySeries: ChartSeries[] = [
    { key: 'posts', label: 'Bài viết mới', color: 'var(--primary)' },
    { key: 'comments', label: 'Bình luận mới', color: 'var(--info)' },
  ];
  readonly primaryCards = computed<MetricCard[]>(() => [
    this.card(
      'Tổng người dùng',
      'users',
      'group',
      `${this.format(this.period('newUsers'))} người dùng mới trong kỳ`,
      'newUsers',
    ),
    this.card(
      'Tổng cơ sở cho thuê',
      'properties',
      'apartment',
      `${this.format(this.period('newProperties'))} cơ sở mới trong kỳ`,
      'newProperties',
    ),
    this.card(
      'Tin đăng hiển thị',
      'publishedListings',
      'storefront',
      `${this.format(this.period('newListings'))} tin được tạo trong kỳ`,
      'newListings',
    ),
    {
      label: 'Doanh thu dịch vụ',
      value: this.period('revenue'),
      icon: 'payments',
      scope: 'Trong kỳ',
      money: true,
      note: 'Giao dịch thành công, đã xác nhận',
      ...this.change('revenue'),
    },
  ]);
  readonly rentalCards = computed<MetricCard[]>(() => [
    this.card(
      'Phòng/căn đang trống',
      'availableRooms',
      'meeting_room',
      'Không gồm phòng đang giữ hợp đồng',
    ),
    {
      label: 'Yêu cầu thuê mới',
      value: this.period('rentalRequests'),
      icon: 'home_work',
      scope: 'Trong kỳ',
      note: 'Yêu cầu được gửi trong kỳ',
      ...this.change('rentalRequests'),
    },
    {
      label: 'Hợp đồng mới xác nhận',
      value: this.period('newAgreements'),
      icon: 'contract',
      scope: 'Trong kỳ',
      note: 'Đã có xác nhận của cả hai bên',
      ...this.change('newAgreements'),
    },
    this.card(
      'Hợp đồng đang hiệu lực',
      'activeAgreements',
      'verified',
      'Hợp đồng hoạt động, chưa hết hạn',
    ),
  ]);
  readonly communityCards = computed<MetricCard[]>(() => [
    {
      label: 'Bài viết mới',
      value: this.period('posts'),
      icon: 'article',
      scope: 'Trong kỳ',
      note: 'Không bao gồm bài đã xóa',
      ...this.change('posts'),
    },
    {
      label: 'Bình luận mới',
      value: this.period('comments'),
      icon: 'chat_bubble',
      scope: 'Trong kỳ',
      note: 'Không bao gồm bình luận đã xóa',
      ...this.change('comments'),
    },
    {
      label: 'Lượt cảm xúc',
      value: this.period('reactions'),
      icon: 'favorite',
      scope: 'Trong kỳ',
      note: 'Cảm xúc còn lưu, được tạo trong kỳ',
      ...this.change('reactions'),
    },
    {
      ...this.card(
        'Nội dung chờ kiểm duyệt',
        'pendingModeration',
        'policy',
        'Gồm bài viết, bình luận và đánh giá',
      ),
      warning: this.current('pendingModeration') > 0,
    },
  ]);
  readonly operationCards = computed<MetricCard[]>(() => [
    this.card(
      'Chủ trọ dùng gói trả phí',
      'paidLandlords',
      'card_membership',
      'Gói dịch vụ đang trong kỳ hiệu lực',
    ),
    this.card('Gói Boost hiệu lực', 'activeBoosts', 'bolt', 'Gói đã kích hoạt và còn hạn'),
    {
      ...this.card(
        'Báo cáo chưa xử lý',
        'openReports',
        'flag',
        'Báo cáo tin đăng, chủ trọ chờ/đang xử lý',
      ),
      warning: this.current('openReports') > 0,
    },
    {
      ...this.card(
        'Giao dịch cần đối soát',
        'reviewPayments',
        'account_balance',
        'Giao dịch được đánh dấu cần kiểm tra',
      ),
      warning: this.current('reviewPayments') > 0,
    },
  ]);
  readonly statuses = computed(() =>
    [
      { key: 'PUBLISHED', label: 'Đang hiển thị', color: 'var(--primary)' },
      { key: 'HIDDEN', label: 'Đã ẩn', color: '#82b9b2' },
      { key: 'EXPIRED', label: 'Hết hạn', color: '#a6b0bf' },
      { key: 'PENDING', label: 'Chờ duyệt', color: 'var(--secondary-light)' },
      { key: 'REJECTED', label: 'Bị từ chối', color: '#db7d7d' },
    ].map((s) => ({ ...s, value: this.data()?.listingStatuses[s.key] || 0 })),
  );
  readonly listingTotal = computed(() => this.statuses().reduce((total, s) => total + s.value, 0));
  readonly serviceShare = computed(() =>
    this.period('revenue') > 0 ? (this.period('serviceRevenue') / this.period('revenue')) * 100 : 0,
  );
  readonly donut = computed(() =>
    this.period('revenue') > 0
      ? `conic-gradient(var(--primary) 0% ${this.serviceShare()}%, var(--secondary-light) ${this.serviceShare()}% 100%)`
      : '#e9eef1',
  );
  readonly noActivity = computed(
    () => !!this.data() && !Object.values(this.data()!.period).some((value) => value > 0),
  );
  readonly days = computed(() => {
    const d = this.data();
    return d ? Math.round((Date.parse(d.to) - Date.parse(d.from)) / 86400000) + 1 : 7;
  });

  constructor() {
    this.requests
      .pipe(
        switchMap(({ from, to }) => {
          this.loading.set(true);
          this.error.set('');
          this.data.set(null);
          return this.api.overview(from, to).pipe(
            catchError((error) => {
              this.error.set(
                error.status === 403
                  ? 'Bạn chưa có quyền xem tổng quan hệ thống.'
                  : 'Không thể tải số liệu thống kê. Vui lòng thử lại.',
              );
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

  selectPreset(days: number): void {
    this.preset.set(days);
    this.validation.set('');
    if (!days) return;
    this.to = this.today;
    this.from = this.daysAgo(days - 1);
    this.reload();
  }
  reload(): void {
    const start = Date.parse(this.from),
      end = Date.parse(this.to);
    const validDate = (value: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0, 10) === value;
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      !validDate(this.from) ||
      !validDate(this.to) ||
      start > end ||
      this.to > this.today ||
      end - start >= 366 * 86400000
    ) {
      this.validation.set('Chọn khoảng từ 1 đến 366 ngày, ngày kết thúc không vượt quá hôm nay.');
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
  format(value: number, money = false) {
    return money
      ? TextUtils.toVnd(Math.round(value), '₫')
      : Math.round(value).toLocaleString('vi-VN');
  }
  compact(value: number) {
    return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(
      value,
    );
  }
  percent(value: number) {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value) + '%';
  }
  private card(
    label: string,
    key: string,
    icon: string,
    note: string,
    changeKey?: string,
  ): MetricCard {
    return {
      label,
      value: this.current(key),
      icon,
      note,
      scope: 'Hiện tại',
      ...(changeKey ? this.change(changeKey) : {}),
    };
  }
  private change(key: string) {
    const current = this.period(key),
      previous = this.data()?.previous[key] || 0;
    if (!previous)
      return { change: current ? 'Mới phát sinh' : '0%', direction: current ? 'up' : 'flat' };
    const delta = ((current - previous) / previous) * 100;
    return {
      change: `${delta > 0 ? '+' : ''}${this.percent(delta)}`,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    };
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
