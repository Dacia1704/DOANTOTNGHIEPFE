import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaymentService } from '@services/payment/payment.service';
import { Payment } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingStatusComponent } from '@shared/components/billing-status/billing-status.component';
import {
  ManagementTableComponent,
  ManagementTableColumn,
} from '@shared/components/management-table/management-table.component';
import { ManagementTableCellDirective } from '@shared/components/management-table/management-table-cell.directive';

@Component({
  selector: 'app-payment-history-page',
  imports: [
    CurrencyPipe,
    RouterLink,
    BillingStatusComponent,
    ManagementTableComponent,
    ManagementTableCellDirective,
  ],
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
  readonly total = signal(0);
  readonly pageSize = signal(10);
  readonly pagination = computed(() => ({
    page: this.page(),
    total: this.total(),
    totalPages: this.totalPages(),
  }));
  readonly paymentKey = (payment: Payment) => payment.id;
  readonly columns: readonly ManagementTableColumn<Payment>[] = [
    { key: 'order', label: 'Mã giao dịch', value: (payment) => payment.merchantOrderId },
    { key: 'type', label: 'Loại giao dịch', value: (payment) => this.ui.label(payment.type) },
    { key: 'amount', label: 'Số tiền', align: 'right' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'date', label: 'Thời gian' },
    { key: 'actions', label: 'Thao tác', align: 'right' },
  ];
  constructor() {
    this.load(0);
  }
  load(page: number): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.api
      .list(page, this.pageSize())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.page.set(result.page);
          this.totalPages.set(result.totalPages);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.loading.set(false);
        },
      });
  }
  changePageSize(size: number): void {
    if (this.loading()) return;
    this.pageSize.set(size);
    this.load(0);
  }
}
