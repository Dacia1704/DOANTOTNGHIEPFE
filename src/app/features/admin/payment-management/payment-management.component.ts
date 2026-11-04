import { computed } from '@angular/core';
import {
  ManagementTableComponent,
  ManagementTableColumn,
} from '@shared/components/management-table/management-table.component';
import { ManagementTableCellDirective } from '@shared/components/management-table/management-table-cell.directive';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, catchError, distinctUntilChanged, forkJoin, map, of } from 'rxjs';
import { PaymentService } from '@services/payment/payment.service';
import { Payment } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingStatusComponent } from '@shared/components/billing-status/billing-status.component';

@Component({
  selector: 'app-payment-management',
  imports: [
    CurrencyPipe,
    RouterLink,
    ManagementTableComponent,
    ManagementTableCellDirective,
    BillingStatusComponent,
  ],
  templateUrl: './payment-management.component.html',
  styleUrl: './payment-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentManagementComponent {
  readonly pageSize = signal(10);
  readonly total = signal(0);
  readonly pagination = computed(() => ({
    page: this.page(),
    total: this.total(),
    totalPages: this.totalPages(),
  }));
  readonly rowKey = (payment: Payment) => payment.id;
  readonly columns: readonly ManagementTableColumn<Payment>[] = [
    { key: 'order', label: 'Mã giao dịch', value: (payment) => payment.merchantOrderId },
    { key: 'type', label: 'Loại giao dịch', value: (payment) => this.ui.label(payment.type) },
    { key: 'amount', label: 'Số tiền', align: 'right' },
    { key: 'date', label: 'Thời gian' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Thao tác' },
  ];
  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.load(0);
  }

  private readonly api = inject(PaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  readonly ui = BillingUtils;
  readonly tab = signal<'all' | 'review'>('all');
  readonly items = signal<Payment[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly allCount = signal<number | null>(null);
  readonly reviewCount = signal<number | null>(null);

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => (params.get('tab') === 'review' ? ('review' as const) : ('all' as const))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((tab) => {
        this.tab.set(tab);
        this.load(0);
      });
  }

  load(page = this.page()): void {
    // Switching tabs cancels an older request so a late response cannot replace the new list.
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.items.set([]);
    this.page.set(page);
    const review = this.tab() === 'review';
    const request = review
      ? this.api
          .review(page, this.pageSize())
          .pipe(map((result) => ({ result, reviewCount: result.total })))
      : forkJoin({
          result: this.api.adminList(page, this.pageSize()),
          queue: this.api.review(0).pipe(catchError(() => of(null))),
        }).pipe(map(({ result, queue }) => ({ result, reviewCount: queue?.total ?? null })));
    this.request = request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: ({ result, reviewCount }) => {
        this.items.set(result.items);
        this.total.set(result.total);
        this.page.set(result.page);
        this.totalPages.set(result.totalPages);
        this.reviewCount.set(reviewCount);
        if (!review) this.allCount.set(result.total);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(BillingUtils.error(error));
        this.totalPages.set(0);
        this.loading.set(false);
      },
    });
  }
}
