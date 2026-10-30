import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaymentService } from '@services/payment.service';
import { Payment } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingStatusComponent } from '@shared/components/billing-status/billing-status.component';
import { BillingPagerComponent } from '@shared/components/billing-pager/billing-pager.component';

@Component({
  selector: 'app-payment-history-page',
  imports: [CurrencyPipe, RouterLink, BillingStatusComponent, BillingPagerComponent],
  templateUrl: './payment-history-page.component.html',
  styleUrl: './payment-history-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentHistoryPageComponent {
  private readonly api = inject(PaymentService);
  private readonly destroy = inject(DestroyRef);
  readonly ui = BillingUtils;
  readonly items = signal<Payment[]>([]);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  constructor() {
    this.load(0);
  }
  load(page: number): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.api
      .list(page)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
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
}
