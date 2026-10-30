import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ServicePackageService } from '@services/service-package.service';
import { BoostService } from '@services/boost.service';
import { BoostPackage, ResultPage, ServicePackage } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingPagerComponent } from '@shared/components/billing-pager/billing-pager.component';
import { CatalogEditorComponent } from './catalog-editor/catalog-editor.component';
import { PriceEditorComponent } from './price-editor/price-editor.component';
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
  constructor() {
    this.load(0);
  }
  load(page = this.page()): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const request: Observable<ResultPage<ServicePackage | BoostPackage>> =
      this.kind === 'service' ? this.api.list(page) : this.boosts.catalog(page);
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (result: ResultPage<ServicePackage | BoostPackage>) => {
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
  edit(item?: ServicePackage | BoostPackage): void {
    this.dialog
      .open(CatalogEditorComponent, {
        width: '680px',
        maxWidth: '96vw',
        data: { kind: this.kind, item },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((changed) => {
        if (changed) this.load();
      });
  }
  prices(item: ServicePackage | BoostPackage): void {
    this.dialog.open(PriceEditorComponent, { width: '680px', maxWidth: '96vw', data: item });
  }
  toggle(item: ServicePackage | BoostPackage): void {
    if (item.code === 'FREE' || this.busy()) return;
    this.busy.set(true);
    this.dialog
      .open(BillingConfirmComponent, {
        width: '460px',
        maxWidth: '95vw',
        data: {
          title: item.active ? 'Ngừng bán gói' : 'Bật bán gói',
          message: `${item.name}\nThay đổi chỉ áp dụng cho danh mục. Các đơn và quyền đã mua giữ nguyên snapshot.`,
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
