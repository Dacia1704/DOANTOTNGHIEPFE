import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ServicePackageService } from '@services/subscription/service-package.service';
import { BoostService } from '@services/subscription/boost.service';
import {
  BoostPackage,
  PriceOption,
  ResultPage,
  ServicePackage,
} from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingPagerComponent } from '@shared/components/billing-pager/billing-pager.component';
import { CatalogEditorComponent } from './catalog-editor/catalog-editor.component';
import { BillingConfirmComponent } from '@shared/components/billing-confirm/billing-confirm.component';

@Component({
  selector: 'app-billing-catalog',
  imports: [CurrencyPipe, BillingPagerComponent],
  templateUrl: './billing-catalog.component.html',
  styleUrl: './billing-catalog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingCatalogComponent {
  private readonly api = inject(ServicePackageService);
  private readonly boosts = inject(BoostService);
  private readonly dialog = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  readonly kind = inject(ActivatedRoute).snapshot.data['catalog'] as 'service' | 'boost';
  readonly items = signal<(ServicePackage | BoostPackage)[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly pricesByPackage = signal<Record<string, PriceOption[] | null>>({});
  constructor() {
    this.load(0);
  }
  load(page = this.page()): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const request: Observable<ResultPage<ServicePackage | BoostPackage>> =
      this.kind === 'service' ? this.api.list(page) : this.boosts.catalog(page);
    request
      .pipe(
        switchMap((result) => {
          const requests =
            this.kind === 'service'
              ? result.items
                  .filter((item) => item.code !== 'FREE')
                  .map((item) =>
                    this.api.prices(item.id, true).pipe(
                      map((prices) => ({
                        id: item.id,
                        prices: prices.filter((price) => price.active) as PriceOption[] | null,
                      })),
                      catchError(() => of({ id: item.id, prices: null })),
                    ),
                  )
              : [];
          return (requests.length ? forkJoin(requests) : of([])).pipe(
            map((prices) => ({
              result,
              prices: Object.fromEntries(prices.map((item) => [item.id, item.prices])),
            })),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: ({ result, prices }) => {
          this.items.set(result.items);
          this.pricesByPackage.set(prices);
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
  edit(item?: ServicePackage | BoostPackage): void {
    this.dialog
      .open(CatalogEditorComponent, {
        width: '840px',
        maxWidth: '96vw',
        maxHeight: '92dvh',
        data: { kind: this.kind, item },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      // Refresh even on dismissal: a failed multi-request save may have persisted part of the form.
      .subscribe(() => this.load());
  }
  toggle(item: ServicePackage | BoostPackage): void {
    if (item.code === 'FREE' || this.busy()) return;
    if (this.kind === 'service' && !item.active && !this.pricesByPackage()[item.id]?.length) {
      this.edit(item);
      return;
    }
    this.busy.set(true);
    this.dialog
      .open(BillingConfirmComponent, {
        width: '460px',
        maxWidth: '95vw',
        data: {
          title: item.active ? 'Ngừng bán gói' : 'Bật bán gói',
          message: `${item.name}\nTrạng thái áp dụng cho toàn bộ gói và các thời hạn. Các đơn và quyền đã mua được giữ nguyên.`,
          action: item.active ? 'Ngừng bán' : 'Bật bán',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((confirmed) => {
        if (!confirmed) {
          this.busy.set(false);
          return;
        }
        const request: Observable<ServicePackage | BoostPackage> =
          this.kind === 'service'
            ? this.api.status(item.id, !item.active)
            : this.boosts.status(item.id, !item.active);
        request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
          next: () => {
            this.busy.set(false);
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
