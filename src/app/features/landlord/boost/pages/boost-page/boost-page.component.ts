import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  input,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BoostService } from '@services/subscription/boost.service';
import { ListingService } from '@services/listing/listing.service';
import {
  ActiveBoost,
  BoostPackage,
  BoostSubscription,
  Listing,
} from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingStatusComponent } from '@shared/components/billing-status/billing-status.component';
import {
  ManagementTableComponent,
  ManagementTableColumn,
} from '@shared/components/management-table/management-table.component';
import { ManagementTableCellDirective } from '@shared/components/management-table/management-table-cell.directive';
import { BillingConfirmComponent } from '@shared/components/billing-confirm/billing-confirm.component';
import { BoostAllocationDialogComponent } from '../../components/boost-allocation-dialog/boost-allocation-dialog.component';

@Component({
  selector: 'app-boost-page',
  imports: [
    CurrencyPipe,
    RouterLink,
    BillingStatusComponent,
    ManagementTableComponent,
    ManagementTableCellDirective,
  ],
  templateUrl: './boost-page.component.html',
  styleUrl: './boost-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoostPageComponent {
  readonly embedded = input(false);
  private readonly api = inject(BoostService);
  private readonly dialog = inject(MatDialog);
  private readonly listingsApi = inject(ListingService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  readonly ui = BillingUtils;
  readonly tab = signal<'active' | 'catalog' | 'history'>('active');
  readonly active = signal<ActiveBoost[]>([]);
  readonly catalog = signal<BoostPackage[]>([]);
  readonly history = signal<BoostSubscription[]>([]);
  readonly activeLoading = signal(false);
  readonly catalogLoading = signal(false);
  readonly historyLoading = signal(false);
  readonly activeError = signal('');
  readonly catalogError = signal('');
  readonly historyError = signal('');
  readonly busy = signal(false);
  readonly purchaseError = signal('');
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly total = signal(0);
  readonly pageSize = signal(10);
  readonly pagination = computed(() => ({
    page: this.page(),
    total: this.total(),
    totalPages: this.totalPages(),
  }));
  readonly boostKey = (boost: BoostSubscription) => boost.id;
  readonly historyColumns: readonly ManagementTableColumn<BoostSubscription>[] = [
    { key: 'package', label: 'Gói Boost', value: (boost) => boost.packageNameSnapshot },
    { key: 'quota', label: 'Số suất ưu tiên' },
    { key: 'duration', label: 'Thời hạn' },
    { key: 'price', label: 'Giá mua', align: 'right' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Thao tác', align: 'right' },
  ];
  readonly listings = signal<Record<string, Listing>>({});
  readonly totals = computed(() =>
    this.active().reduce(
      (sum, item) => ({
        high: sum.high + item.remainingHighPrioritySlots,
        low: sum.low + item.remainingLowPrioritySlots,
      }),
      { high: 0, low: 0 },
    ),
  );
  constructor() {
    this.loadActive();
  }
  switchTab(tab: 'active' | 'catalog' | 'history'): void {
    this.tab.set(tab);
    if (tab === 'active') this.loadActive();
    if (tab === 'catalog') this.loadCatalog();
    if (tab === 'history') this.loadHistory(0);
  }
  loadActive(): void {
    if (this.activeLoading()) return;
    this.activeLoading.set(true);
    this.activeError.set('');
    this.api
      .active()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (items) => {
          this.active.set(items);
          this.activeLoading.set(false);
          // Titles are supplementary; a failure must not hide server quota or block buying Boost.
          this.listingsApi
            .allMine()
            .pipe(takeUntilDestroyed(this.destroy))
            .subscribe({
              next: (listings) =>
                this.listings.set(
                  Object.fromEntries(listings.map((listing) => [listing.id, listing])),
                ),
              error: () => this.listings.set({}),
            });
        },
        error: (error) => {
          this.activeError.set(BillingUtils.error(error));
          this.activeLoading.set(false);
        },
      });
  }
  loadCatalog(): void {
    if (this.catalogLoading()) return;
    this.catalogLoading.set(true);
    this.catalogError.set('');
    this.api
      .packages()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (items) => {
          this.catalog.set(items);
          this.catalogLoading.set(false);
        },
        error: (error) => {
          this.catalogError.set(BillingUtils.error(error));
          this.catalogLoading.set(false);
        },
      });
  }
  loadHistory(page: number): void {
    if (this.historyLoading()) return;
    this.historyLoading.set(true);
    this.historyError.set('');
    this.api
      .list(page, this.pageSize())
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.history.set(result.items);
          this.page.set(result.page);
          this.totalPages.set(result.totalPages);
          this.total.set(result.total);
          this.historyLoading.set(false);
        },
        error: (error) => {
          this.historyError.set(BillingUtils.error(error));
          this.historyLoading.set(false);
        },
      });
  }
  changePageSize(size: number): void {
    if (this.historyLoading() || this.busy()) return;
    this.pageSize.set(size);
    this.loadHistory(0);
  }
  buy(pkg: BoostPackage): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.purchaseError.set('');
    this.dialog
      .open(BillingConfirmComponent, {
        width: '480px',
        maxWidth: '95vw',
        data: {
          title: `Mua ${pkg.name}`,
          message: `${pkg.highPrioritySlots} suất cao, ${pkg.lowPrioritySlots} suất thấp trong ${pkg.durationMonths} tháng.\nGói bắt đầu tính hạn sau khi kích hoạt, kể cả khi chưa phân bổ suất. Bạn tự gán cho tin sau khi thanh toán. Boost không gia hạn tin đăng.`,
          action: 'Tạo đơn và xem thanh toán',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((confirmed) => {
        if (!confirmed) {
          this.busy.set(false);
          return;
        }
        this.api
          .create({ boostPackageId: pkg.id })
          .pipe(takeUntilDestroyed(this.destroy))
          .subscribe({
            next: (boost) => {
              this.busy.set(false);
              this.router.navigate(['/thanh-toan/xac-nhan/BOOST_PACKAGE', boost.id]);
            },
            error: (error) => {
              this.purchaseError.set(BillingUtils.error(error));
              this.busy.set(false);
            },
          });
      });
  }
  allocate(boostSubscriptionId?: string, listingId?: string): void {
    this.dialog
      .open(BoostAllocationDialogComponent, {
        width: '680px',
        maxWidth: '96vw',
        data: { boostSubscriptionId, listingId },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((changed) => {
        if (changed) this.loadActive();
      });
  }
}
