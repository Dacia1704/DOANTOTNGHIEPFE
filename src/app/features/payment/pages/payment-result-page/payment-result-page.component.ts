import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Subscription,
  catchError,
  exhaustMap,
  finalize,
  interval,
  map,
  take,
  takeUntil,
  tap,
  timeout,
  timer,
} from 'rxjs';
import { PaymentService } from '@services/payment.service';
import { SubscriptionService } from '@services/subscription.service';
import { BoostService } from '@services/boost.service';
import { AuthService } from '@services/auth.service';
import { RoleCode } from '@model/auth/auth.model';
import {
  BoostSubscription,
  CurrentSubscription,
  Invoice,
  Payment,
  SubscriptionOrder,
} from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingStatusComponent } from '@shared/components/billing-status/billing-status.component';

@Component({
  selector: 'app-payment-result-page',
  imports: [CurrencyPipe, RouterLink, BillingStatusComponent],
  templateUrl: './payment-result-page.component.html',
  styleUrl: './payment-result-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentResultPageComponent {
  private readonly api = inject(PaymentService);
  private readonly subscriptions = inject(SubscriptionService);
  private readonly boosts = inject(BoostService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  readonly admin = inject(AuthService).primaryRole() === RoleCode.ADMIN;
  readonly ui = BillingUtils;
  readonly payment = signal<Payment | null>(null);
  readonly invoice = signal<Invoice | null>(null);
  readonly order = signal<SubscriptionOrder | null>(null);
  readonly boost = signal<BoostSubscription | null>(null);
  readonly current = signal<CurrentSubscription | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly checking = signal(false);
  readonly verifying = signal(false);
  readonly invoiceState = signal('loading');
  readonly invoiceError = signal('');
  readonly rightsError = signal('');
  readonly checkMessage = signal('');
  readonly copied = signal(false);
  readonly updatedAt = signal<Date | null>(null);
  readonly cooldownUntil = signal(0);
  readonly now = signal(Date.now());
  readonly coolingDown = computed(() => this.cooldownUntil() > this.now());
  private poll?: Subscription;
  private readonly id =
    this.route.snapshot.paramMap.get('paymentId') ??
    this.api.resolve(this.route.snapshot.queryParamMap.get('vnp_TxnRef') ?? '') ??
    '';
  readonly missing = !this.id;
  readonly title = computed(() => {
    const p = this.payment();
    if (!p) return 'Kết quả thanh toán';
    if (p.requiresReview) return 'Đã ghi nhận thanh toán, cần đối soát';
    if (p.status === 'SUCCESS') {
      const order = this.order();
      if (order?.status === 'AWAITING_ADMIN_CONFIRMATION')
        return 'Đã thanh toán, chờ xác nhận đổi gói';
      if (order?.status === 'SCHEDULED') return 'Đã thanh toán, đã xếp lịch đổi gói';
      if (order?.status === 'APPLIED' && order.immediateUpgrade) return 'Nâng gói thành công';
      return 'Thanh toán thành công';
    }
    return p.status === 'PENDING' ? 'Đang chờ xác nhận thanh toán' : BillingUtils.label(p.status);
  });
  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.now.set(Date.now()));
    this.destroy.onDestroy(() => this.poll?.unsubscribe());
    if (!this.missing) this.load();
  }
  load(): void {
    if (this.loading() || this.checking()) return;
    this.loading.set(true);
    this.error.set('');
    this.poll?.unsubscribe();
    this.api
      .get(this.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (payment) => {
          this.apply(payment);
          this.loading.set(false);
          if (['PENDING', 'FAILED', 'EXPIRED'].includes(payment.status)) this.startPolling();
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.loading.set(false);
        },
      });
  }
  check(): void {
    if (this.missing || this.loading() || this.verifying() || this.checking() || this.coolingDown())
      return;
    this.checking.set(true);
    this.error.set('');
    this.checkMessage.set('');
    this.poll?.unsubscribe();
    this.cooldownUntil.set(Date.now() + 10000);
    this.api
      .check(this.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.checkMessage.set(result.message);
          this.apply(result.payment);
          this.checking.set(false);
          if (result.payment.status === 'PENDING') this.startPolling(10000);
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.checking.set(false);
        },
      });
  }
  loadInvoice(): void {
    this.invoiceState.set('loading');
    this.invoiceError.set('');
    this.api
      .invoice(this.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (invoice) => {
          this.invoice.set(invoice);
          this.invoiceState.set('ready');
        },
        error: (error) => {
          this.invoiceState.set(error.status === 404 ? 'missing' : 'error');
          this.invoiceError.set(BillingUtils.error(error));
        },
      });
  }
  loadRights(): void {
    const payment = this.payment();
    if (!payment || this.admin) return;
    this.rightsError.set('');
    if (payment.type === 'SERVICE_PACKAGE') {
      this.subscriptions
        .order(payment.targetId)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (order) => this.order.set(order),
          error: (error) => this.rightsError.set(BillingUtils.error(error)),
        });
      this.subscriptions
        .current()
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (current) => this.current.set(current),
          error: (error) => this.rightsError.set(BillingUtils.error(error)),
        });
    } else {
      this.boosts
        .all()
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (items) => {
            this.boost.set(items.find((item) => item.id === payment.targetId) ?? null);
            if (!this.boost()) this.rightsError.set('Không tìm thấy đăng ký Boost trong lịch sử.');
          },
          error: (error) => this.rightsError.set(BillingUtils.error(error)),
        });
    }
  }
  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.payment()?.merchantOrderId ?? '');
      this.copied.set(true);
    } catch {
      this.checkMessage.set('Bạn có thể chọn và sao chép mã giao dịch hiển thị bên dưới.');
    }
  }
  private apply(payment: Payment, refresh = true): void {
    const previous = this.payment();
    this.payment.set(payment);
    this.updatedAt.set(new Date());
    if (!this.admin) this.api.remember(payment);
    if (payment.status !== 'PENDING') this.poll?.unsubscribe();
    if (
      refresh ||
      !previous ||
      previous.status !== payment.status ||
      previous.requiresReview !== payment.requiresReview
    ) {
      this.loadRights();
      this.loadInvoice();
    }
  }
  private startPolling(initialDelay = 0): void {
    this.poll?.unsubscribe();
    this.verifying.set(true);
    // QueryDr verifies with VNPay and updates the backend even when localhost cannot receive IPN.
    this.poll = timer(initialDelay, 10000)
      .pipe(
        take(6),
        exhaustMap(() => {
          this.checking.set(true);
          this.cooldownUntil.set(Date.now() + 10000);
          return this.api.check(this.id).pipe(
            timeout(15000),
            tap((result) => {
              this.error.set('');
              this.checkMessage.set(result.message);
            }),
            map((result) => result.payment),
            catchError((error) => {
              this.error.set(BillingUtils.error(error));
              return EMPTY;
            }),
            finalize(() => this.checking.set(false)),
          );
        }),
        takeUntil(timer(60000)),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          this.verifying.set(false);
          this.checking.set(false);
        }),
      )
      .subscribe((payment) => this.apply(payment, false));
  }
}
