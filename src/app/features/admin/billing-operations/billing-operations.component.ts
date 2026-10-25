import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { PaymentService } from '@services/payment.service';
import { SubscriptionService } from '@services/subscription.service';
import { Payment, ResultPage, SubscriptionOrder } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingPagerComponent } from '@shared/components/billing-pager/billing-pager.component';
import { BillingStatusComponent } from '@shared/components/billing-status/billing-status.component';
import { BillingConfirmComponent } from '@shared/components/billing-confirm/billing-confirm.component';

@Component({
  selector: 'app-billing-operations',
  imports: [CurrencyPipe, RouterLink, BillingPagerComponent, BillingStatusComponent],
  templateUrl: './billing-operations.component.html',
  styleUrl: './billing-operations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingOperationsComponent {
  private readonly subscriptions = inject(SubscriptionService);
  private readonly payments = inject(PaymentService);
  private readonly dialog = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  readonly review = !!inject(ActivatedRoute).snapshot.data['review'];
  readonly ui = BillingUtils;
  readonly orders = signal<SubscriptionOrder[]>([]);
  readonly items = signal<Payment[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly page = signal(0);
  readonly totalPages = signal(0);
  constructor() {
    this.load(0);
  }
  load(page = this.page()): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const request: Observable<ResultPage<Payment | SubscriptionOrder>> = this.review
      ? this.payments.review(page)
      : this.subscriptions.awaiting(page);
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (result: ResultPage<Payment | SubscriptionOrder>) => {
        if (this.review) this.items.set(result.items as Payment[]);
        else this.orders.set(result.items as SubscriptionOrder[]);
        this.page.set(result.page);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(BillingUtils.error(error));
        this.loading.set(false);
      },
    });
  }
  confirm(order: SubscriptionOrder): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.dialog
      .open(BillingConfirmComponent, {
        width: '480px',
        maxWidth: '95vw',
        data: {
          title: 'Xác nhận đổi gói',
          message: `${order.rights.packageName} · ${order.durationMonths} tháng\nNếu gói cũ còn hạn, gói mới bắt đầu sau hạn tổng. Nếu đã hết hạn, bắt đầu tại thời điểm xác nhận. Ngày hiệu lực do máy chủ quyết định.`,
          action: 'Xác nhận đổi gói',
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
          .confirm(order.id)
          .pipe(takeUntilDestroyed(this.destroy))
          .subscribe({
            next: (result) => {
              this.busy.set(false);
              this.success.set(
                `Đã xác nhận ${result.rights.packageName}. ${BillingUtils.label(result.status)}. Hiệu lực: ${BillingUtils.date(result.effectiveAt)} – ${BillingUtils.date(result.endAt)}.`,
              );
              this.load();
            },
            error: (error) => {
              this.error.set(BillingUtils.error(error));
              this.busy.set(false);
            },
          });
      });
  }
}
