import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import { ServicePackageService } from '@services/service-package.service';
import { SubscriptionService } from '@services/subscription.service';
import {
  CurrentSubscription,
  PriceOption,
  ResultPage,
  ServicePackage,
  Subscription,
  SubscriptionOrder,
  SubscriptionPeriod,
} from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingStatusComponent } from '@shared/components/billing-status/billing-status.component';
import { BillingPagerComponent } from '@shared/components/billing-pager/billing-pager.component';
import { BillingConfirmComponent } from '@shared/components/billing-confirm/billing-confirm.component';

@Component({
  selector: 'app-service-package-page',
  imports: [CurrencyPipe, RouterLink, BillingStatusComponent, BillingPagerComponent],
  templateUrl: './service-package-page.component.html',
  styleUrl: './service-package-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicePackagePageComponent {
  private readonly packagesApi = inject(ServicePackageService);
  private readonly subscriptions = inject(SubscriptionService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly ui = BillingUtils;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly success = signal('');
  readonly busy = signal(false);
  readonly current = signal<CurrentSubscription | null>(null);
  readonly packages = signal<(ServicePackage & { prices: PriceOption[] })[]>([]);
  readonly months = signal(1);
  readonly availableMonths = signal<number[]>([]);
  readonly openChange = signal<SubscriptionOrder | undefined>(undefined);
  readonly tab = signal<'orders' | 'history' | 'periods'>('orders');
  readonly historyLoading = signal(false);
  readonly historyError = signal('');
  readonly orders = signal<SubscriptionOrder[]>([]);
  readonly history = signal<Subscription[]>([]);
  readonly periods = signal<SubscriptionPeriod[]>([]);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly expanded = signal<string | null>(null);

  constructor() {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      current: this.subscriptions.current(),
      packages: this.packagesApi.all(),
      orders: this.subscriptions.allOrders(),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (data) => {
          const requests = data.packages.map((pkg) =>
            pkg.code === 'FREE' ? of([] as PriceOption[]) : this.packagesApi.prices(pkg.id),
          );
          (requests.length ? forkJoin(requests) : of([] as PriceOption[][]))
            .pipe(takeUntilDestroyed(this.destroy))
            .subscribe({
              next: (prices) => {
                this.current.set(data.current);
                this.packages.set(
                  data.packages.map((pkg, index) => ({ ...pkg, prices: prices[index] })),
                );
                const durations = [
                  ...new Set(
                    prices
                      .flat()
                      .filter((price) => price.active)
                      .map((price) => price.durationMonths),
                  ),
                ].sort((a, b) => a - b);
                this.availableMonths.set(durations);
                if (!durations.includes(this.months())) this.months.set(durations[0] ?? 1);
                this.openChange.set(
                  data.current.scheduledChange ?? BillingUtils.openChange(data.orders),
                );
                this.loading.set(false);
                this.loadHistory(0);
              },
              error: (error) => {
                this.error.set(BillingUtils.error(error));
                this.loading.set(false);
              },
            });
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.loading.set(false);
        },
      });
  }
  price(pkg: ServicePackage & { prices: PriceOption[] }): PriceOption | undefined {
    return pkg.prices.find((price) => price.active && price.durationMonths === this.months());
  }
  type(pkg: ServicePackage) {
    const currentPackage = this.packages().find(
      (item) => item.code === this.current()?.rights.packageCode,
    );
    return BillingUtils.orderType(this.current()!, pkg.id, currentPackage?.id);
  }
  blocked(pkg: ServicePackage): boolean {
    return (
      !!this.openChange() &&
      (this.openChange()!.status === 'SCHEDULED' || this.type(pkg) === 'CHANGE')
    );
  }
  choose(pkg: ServicePackage & { prices: PriceOption[] }): void {
    const price = this.price(pkg);
    if (!price || this.busy() || this.blocked(pkg)) return;
    const type = this.type(pkg);
    this.success.set('');
    this.busy.set(true);
    this.dialog
      .open(BillingConfirmComponent, {
        width: '480px',
        maxWidth: '95vw',
        data: {
          title: `${BillingUtils.label(type)}: ${pkg.name}`,
          message:
            (type === 'CHANGE'
              ? `Bảng giá tham chiếu: ${price.durationMonths} tháng. Phí thực tế và cách áp dụng được máy chủ báo trong đơn.\n`
              : `${price.durationMonths} tháng. Bạn sẽ xem tổng tiền từ đơn trước khi thanh toán.\n`) +
            (type === 'CHANGE'
              ? 'Nâng gói: tính phí chênh lệch cho thời gian còn lại, áp dụng sau xác nhận thanh toán và giữ nguyên hạn đã mua. Phí bằng 0 được áp dụng ngay khi tạo đơn. Hạ hoặc đổi ngang: thanh toán cả kỳ mới và tự xếp lịch từ hạn tổng hiện tại.'
              : type === 'RENEW'
                ? 'Kỳ gia hạn nối tiếp sau hạn tổng của gói hiện tại.'
                : 'Quyền sử dụng bắt đầu sau khi thanh toán được xác nhận hợp lệ.'),
          action: type === 'CHANGE' ? 'Tạo đơn và xem báo giá' : 'Tạo đơn và xem thanh toán',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((confirmed) => {
        if (!confirmed) {
          this.busy.set(false);
          return;
        }
        this.subscriptions
          .create({ priceOptionId: price.id, type })
          .pipe(takeUntilDestroyed(this.destroy))
          .subscribe({
            next: (order) => {
              this.busy.set(false);
              if (order.status === 'APPLIED') {
                this.success.set(
                  `Đã áp dụng ${order.rights.packageName}. ${order.price === 0 ? 'Không phát sinh khoản thanh toán VNPay.' : 'Xem thông tin quyền sử dụng đã cập nhật.'}`,
                );
                this.expanded.set(order.id);
                this.load();
                return;
              }
              this.router.navigate(['/thanh-toan/xac-nhan', 'SERVICE_PACKAGE', order.id]);
            },
            error: (error) => {
              this.error.set(BillingUtils.error(error));
              this.busy.set(false);
            },
          });
      });
  }
  switchTab(tab: 'orders' | 'history' | 'periods'): void {
    if (this.historyLoading()) return;
    this.tab.set(tab);
    this.loadHistory(0);
  }
  loadHistory(page: number): void {
    if (this.historyLoading()) return;
    this.historyLoading.set(true);
    this.historyError.set('');
    const request: Observable<ResultPage<SubscriptionOrder | Subscription | SubscriptionPeriod>> =
      this.tab() === 'orders'
        ? this.subscriptions.orders(page)
        : this.tab() === 'history'
          ? this.subscriptions.history(page)
          : this.subscriptions.periods(page);
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (result: ResultPage<SubscriptionOrder | Subscription | SubscriptionPeriod>) => {
        if (this.tab() === 'orders') this.orders.set(result.items as SubscriptionOrder[]);
        if (this.tab() === 'history') this.history.set(result.items as Subscription[]);
        if (this.tab() === 'periods') this.periods.set(result.items as SubscriptionPeriod[]);
        this.page.set(result.page);
        this.totalPages.set(result.totalPages);
        this.historyLoading.set(false);
      },
      error: (error) => {
        this.historyError.set(BillingUtils.error(error));
        this.historyLoading.set(false);
      },
    });
  }
}
