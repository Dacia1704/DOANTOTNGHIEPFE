import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import {
  RentalAgreement,
  RentalRequest,
  RentalSummary,
  RENTAL_LABELS,
} from '@model/rental/rental.model';
import { Property } from '@model/property/property.model';
import { RentalService } from '@services/rental/rental.service';
import { PropertyService } from '@services/property/property.service';
import { ConfirmRentalDialogComponent } from './confirm-rental-dialog.component';
import { RentalRequestDetailDialogComponent } from './rental-request-detail-dialog.component';
import { RoomUtils } from '@shared/utils/room-utils';
import { ImageUtils } from '@shared/utils/image-utils';
import { AuthService } from '@services/auth/auth.service';
import {
  ManagementTableComponent,
  ManagementTableColumn,
} from '@shared/components/management-table/management-table.component';
import { ManagementTableCellDirective } from '@shared/components/management-table/management-table-cell.directive';

@Component({
  selector: 'app-rental-list',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    FormsModule,
    RouterLink,
    ManagementTableComponent,
    ManagementTableCellDirective,
  ],
  templateUrl: './rental-list-page.component.html',
  styleUrl: './rental-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalListPageComponent implements OnInit {
  private readonly api = inject(RentalService);
  private readonly propertiesApi = inject(PropertyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(MatDialog);
  private readonly toast = inject(MatSnackBar);
  private readonly destroy = inject(DestroyRef);
  readonly owner = !!this.route.snapshot.data['landlord'];
  readonly agreementPath = this.owner ? '/landlord/agreements' : '/hop-dong';
  readonly labels = RENTAL_LABELS;
  readonly utils = RoomUtils;
  readonly session = inject(AuthService).session;
  readonly summary = signal<RentalSummary | null>(null);
  readonly summaryError = signal('');
  private summarySubscription?: Subscription;
  readonly tenantTabs = [
    { status: '', label: 'Tất cả' },
    { status: 'PENDING', label: 'Đang chờ phản hồi' },
    { status: 'ACCEPTED', label: 'Đã chấp nhận' },
    { status: 'REJECTED', label: 'Đã từ chối' },
    { status: 'EXPIRED', label: 'Đã hết hạn' },
  ];
  readonly statusIcons: Record<string, string> = {
    PENDING: 'schedule',
    ACCEPTED: 'check_circle',
    REJECTED: 'cancel',
    EXPIRED: 'timer_off',
    CANCELLED: 'block',
    ACTIVE: 'verified',
    PENDING_CONFIRMATION: 'hourglass_top',
    TERMINATED: 'task_alt',
  };
  keyword = '';
  order = 'newest';
  readonly requests = signal<RentalRequest[]>([]);
  readonly contracts = signal<RentalAgreement[]>([]);
  readonly properties = signal<Property[]>([]);
  private detailDialog?: MatDialogRef<RentalRequestDetailDialogComponent>;
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  tab: 'requests' | 'agreements' = 'requests';
  status = this.owner ? 'PENDING' : '';
  propertyId = '';
  roomId = '';
  page = 0;
  totalPages = 0;
  totalElements = 0;
  total = 0;
  pageSize = 10;
  readonly requestKey = (request: RentalRequest) => request.id;
  readonly agreementKey = (agreement: RentalAgreement) => agreement.id;
  readonly requestColumns: readonly ManagementTableColumn<RentalRequest>[] = [
    { key: 'room', label: 'Cơ sở / phòng' },
    { key: 'tenant', label: 'Khách thuê', value: (request) => request.tenantName },
    { key: 'stay', label: 'Thông tin thuê' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Thao tác' },
  ];
  readonly agreementColumns: readonly ManagementTableColumn<RentalAgreement>[] = [
    { key: 'code', label: 'Mã hợp đồng', value: (agreement) => agreement.agreementCode },
    { key: 'room', label: 'Cơ sở / phòng' },
    { key: 'tenant', label: 'Khách thuê', value: (agreement) => agreement.tenantName },
    { key: 'dates', label: 'Thời hạn thuê' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Thao tác' },
  ];
  get pagination() {
    return { page: this.page, total: this.total, totalPages: this.totalPages };
  }
  imageSource(value: string | null | undefined): string {
    return value?.startsWith('/') && !value.startsWith('//') && !value.startsWith('/9j/')
      ? value
      : ImageUtils.toImageSrc(value);
  }
  changePage(page: number) {
    if (this.loading() || this.busy()) return;
    this.page = page;
    this.load();
  }
  changePageSize(size: number) {
    if (this.loading() || this.busy()) return;
    this.pageSize = size;
    this.page = 0;
    this.load();
  }
  resetFilters() {
    this.status = '';
    this.propertyId = '';
    this.roomId = '';
    this.filter();
  }
  get rooms() {
    return this.properties().find((p) => p.id === this.propertyId)?.rooms ?? [];
  }
  ngOnInit() {
    this.load();
    if (this.owner)
      this.propertiesApi
        .getAllMine()
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({ next: (p) => this.properties.set(p), error: () => {} });
  }
  selectTenantTab(status: string): void {
    if (this.loading() || this.busy()) return;
    this.tab = status === 'agreements' ? 'agreements' : 'requests';
    this.status = status === 'agreements' ? '' : status;
    this.page = 0;
    this.load();
  }
  private loadSummary(): void {
    this.summarySubscription?.unsubscribe();
    this.summaryError.set('');
    this.summarySubscription = this.api
      .summary()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (summary) => this.summary.set(summary),
        error: () => this.summaryError.set('Chưa tải được số lượng theo trạng thái.'),
      });
  }
  resetTenantSearch(): void {
    this.keyword = '';
    this.order = 'newest';
    this.filter();
  }
  setTab(tab: 'requests' | 'agreements') {
    if (this.loading() || this.busy()) return;
    this.tab = tab;
    this.page = 0;
    this.load();
  }
  load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    if (!this.owner) this.loadSummary();
    if (this.tab === 'requests') {
      if (!this.owner) this.requests.set([]);
      const filters: Record<string, string> = {};
      if (this.status) filters['status'] = this.status;
      if (this.propertyId) filters['propertyId'] = this.propertyId;
      if (this.roomId) filters['roomId'] = this.roomId;
      if (!this.owner) {
        filters['q'] = this.keyword.trim();
        filters['sort'] = this.order;
      }
      this.api
        .requests(this.owner, this.page, filters, this.pageSize)
        .pipe(
          takeUntilDestroyed(this.destroy),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (p) => {
            this.requests.set(p.data);
            this.totalPages = p.totalPages;
            this.totalElements = p.totalElements;
            this.total = p.totalElements;
            this.page = p.currentPage;
          },
          error: (e) => this.fail(e),
        });
    } else {
      if (!this.owner) this.contracts.set([]);
      this.api
        .agreements(
          this.owner,
          this.page,
          this.pageSize,
          this.owner ? {} : { q: this.keyword.trim(), sort: this.order },
        )
        .pipe(
          takeUntilDestroyed(this.destroy),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (p) => {
            this.contracts.set(p.data);
            this.totalPages = p.totalPages;
            this.totalElements = p.totalElements;
            this.total = p.totalElements;
            this.page = p.currentPage;
          },
          error: (e) => this.fail(e),
        });
    }
  }
  filter() {
    this.page = 0;
    this.load();
  }
  view(id: string) {
    if (this.detailDialog) return;
    this.detailDialog = this.dialogs.open(RentalRequestDetailDialogComponent, {
      data: { requestId: id, agreementPath: this.agreementPath },
      width: '880px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: '94dvh',
      autoFocus: 'dialog',
      ariaLabel: 'Chi tiết yêu cầu thuê',
    });
    this.detailDialog
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => (this.detailDialog = undefined));
  }
  action(r: RentalRequest, action: 'accept' | 'reject' | 'cancel') {
    if (this.busy()) return;
    const title =
      action === 'accept'
        ? 'Chấp nhận và giữ phòng'
        : action === 'reject'
          ? 'Từ chối yêu cầu'
          : 'Hủy yêu cầu';
    this.dialogs
      .open(ConfirmRentalDialogComponent, {
        width: '460px',
        maxWidth: '94vw',
        data: {
          title,
          reason: action === 'reject',
          message:
            action === 'accept'
              ? 'Phòng sẽ được giữ 48 giờ để khách xem và xác nhận hợp đồng. Các yêu cầu khác của phòng sẽ bị từ chối.'
              : 'Bạn muốn tiếp tục thao tác này?',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((result) => {
        if (!result || this.busy()) return;
        this.busy.set(true);
        this.error.set('');
        this.api
          .requestAction(r.id, action, result.reason)
          .pipe(
            takeUntilDestroyed(this.destroy),
            finalize(() => this.busy.set(false)),
          )
          .subscribe({
            next: (a) => {
              this.toast.open('Đã cập nhật yêu cầu', 'Đóng', { duration: 3000 });
              if (action === 'accept') void this.router.navigate([this.agreementPath, a.id]);
              else this.load();
            },
            error: (e) => {
              this.load();
              this.fail(e);
            },
          });
      });
  }
  private fail(e: { status?: number; error?: { message?: string } }) {
    this.error.set(e.error?.message || 'Không tải được dữ liệu. Vui lòng thử lại.');
  }
}
