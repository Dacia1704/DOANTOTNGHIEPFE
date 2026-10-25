import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ListingService } from '@services/listing.service';
import { Listing } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';
import { BillingStatusComponent } from '@shared/components/billing-status/billing-status.component';
import { BillingPagerComponent } from '@shared/components/billing-pager/billing-pager.component';
import { BillingConfirmComponent } from '@shared/components/billing-confirm/billing-confirm.component';
import { ListingEditorComponent } from '../../components/listing-editor/listing-editor.component';
import { BoostAllocationDialogComponent } from '../../../boost/components/boost-allocation-dialog/boost-allocation-dialog.component';

@Component({
  selector: 'app-listing-page',
  imports: [RouterLink, BillingStatusComponent, BillingPagerComponent],
  templateUrl: './listing-page.component.html',
  styleUrl: './listing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingPageComponent {
  private readonly api = inject(ListingService);
  private readonly dialog = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  readonly admin = !!inject(ActivatedRoute).snapshot.data['admin'];
  readonly ui = BillingUtils;
  readonly items = signal<Listing[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
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
    (this.admin ? this.api.pending(page) : this.api.mine(page))
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
  holding(listing: Listing): boolean {
    return (
      BillingUtils.published(listing) ||
      (listing.status === 'PENDING' && BillingUtils.future(listing.pendingExpiresAt))
    );
  }
  edit(listing?: Listing, reject = false): void {
    this.dialog
      .open(ListingEditorComponent, { width: '640px', maxWidth: '96vw', data: { listing, reject } })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((changed) => {
        if (changed) {
          this.success.set(reject ? 'Đã từ chối tin.' : 'Đã lưu tin đăng.');
          this.load(0);
        }
      });
  }
  action(listing: Listing, action: 'hide' | 'submit' | 'approve'): void {
    if (this.busy()) return;
    const name =
      action === 'hide' ? 'Ẩn tin' : action === 'approve' ? 'Duyệt tin' : 'Gửi duyệt lại';
    this.busy.set(true);
    this.dialog
      .open(BillingConfirmComponent, {
        width: '460px',
        maxWidth: '95vw',
        data: {
          title: name,
          action: name,
          message:
            `${listing.title}\n` +
            (action === 'hide'
              ? 'Tin ngừng hiển thị và giải phóng suất đang giữ. Hạn gói Boost vẫn tiếp tục tính.'
              : action === 'approve'
                ? 'Tin được kiểm tra lại quyền và hiển thị trong một tháng kể từ lúc duyệt.'
                : 'Tin quay về chờ duyệt và giữ quota trong tối đa 7 ngày.'),
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
          .action(listing.id, action)
          .pipe(takeUntilDestroyed(this.destroy))
          .subscribe({
            next: () => {
              this.busy.set(false);
              this.success.set('Đã cập nhật trạng thái tin.');
              this.load();
            },
            error: (error) => {
              this.error.set(BillingUtils.error(error));
              this.busy.set(false);
            },
          });
      });
  }
  priority(listing: Listing, level: number): void {
    if (this.busy() || !BillingUtils.published(listing)) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .priority(listing.id, level)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.success.set('Đã cập nhật lựa chọn ưu tiên theo gói dịch vụ.');
          this.load();
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.busy.set(false);
        },
      });
  }
  allocation(listing: Listing): void {
    this.dialog
      .open(BoostAllocationDialogComponent, {
        width: '680px',
        maxWidth: '96vw',
        data: { listingId: listing.id },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((changed) => {
        if (changed) this.load();
      });
  }
}
