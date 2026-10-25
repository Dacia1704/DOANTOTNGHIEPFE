import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { PaymentService } from '@services/payment.service';
import { SubscriptionService } from '@services/subscription.service';
import { BoostService } from '@services/boost.service';
import { BoostSubscription, PaymentType, SubscriptionOrder } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingStatusComponent } from '@shared/components/billing-status/billing-status.component';

@Component({
  selector: 'app-checkout-page',
  imports: [CurrencyPipe, RouterLink, BillingStatusComponent],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPageComponent {
  private readonly payments = inject(PaymentService);
  private readonly subscriptions = inject(SubscriptionService);
  private readonly boosts = inject(BoostService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly ui = BillingUtils;
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly order = signal<SubscriptionOrder | null>(null);
  readonly boost = signal<BoostSubscription | null>(null);
  readonly now = signal(Date.now());
  readonly type = this.route.snapshot.paramMap.get('type') as PaymentType;
  readonly targetId = this.route.snapshot.paramMap.get('targetId') ?? '';
  readonly expiresAt = computed(() => this.order()?.expiresAt ?? this.boost()?.paymentExpiresAt);
  readonly remaining = computed(() =>
    Math.max(0, Math.ceil(((this.expiresAt()?.getTime() ?? 0) - this.now()) / 1000)),
  );
  readonly timer = computed(
    () => `${Math.floor(this.remaining() / 60)}:${String(this.remaining() % 60).padStart(2, '0')}`,
  );
  readonly canPay = computed(
    () =>
      (this.order()?.status ?? this.boost()?.status) === 'PENDING_PAYMENT' &&
      this.remaining() > 0 &&
      (this.order()?.price ?? this.boost()?.price ?? 0) > 0,
  );
  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.now.set(Date.now()));
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    if (this.type === 'SERVICE_PACKAGE') {
      this.subscriptions
        .order(this.targetId)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (order) => {
            this.order.set(order);
            this.loading.set(false);
          },
          error: (error) => this.fail(error),
        });
    } else if (this.type === 'BOOST_PACKAGE') {
      this.boosts
        .all()
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (boosts) => {
            const boost = boosts.find((item) => item.id === this.targetId);
            this.boost.set(boost ?? null);
            this.loading.set(false);
            if (!boost) this.error.set('Không tìm thấy đăng ký Boost của bạn.');
          },
          error: (error) => this.fail(error),
        });
    } else {
      this.loading.set(false);
      this.error.set('Loại thanh toán không hợp lệ.');
    }
  }
  pay(): void {
    this.now.set(Date.now());
    if (!this.canPay() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.payments
      .checkout({ type: this.type, targetId: this.targetId })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          if (result.payment.status !== 'PENDING') {
            this.router.navigate(['/thanh-toan', result.payment.id]);
            return;
          }
          try {
            const url = new URL(result.paymentUrl);
            if (url.protocol !== 'https:') throw new Error('URL');
            window.location.assign(url.href);
          } catch {
            this.error.set('Đường dẫn VNPay không hợp lệ. Vui lòng thử lại sau.');
            this.busy.set(false);
          }
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.busy.set(false);
        },
      });
  }
  private fail(error: unknown): void {
    this.error.set(BillingUtils.error(error));
    this.loading.set(false);
  }
}
