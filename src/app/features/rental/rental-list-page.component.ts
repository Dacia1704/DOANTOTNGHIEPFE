import { DatePipe } from '@angular/common';
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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RentalAgreement, RentalRequest, RENTAL_LABELS } from '@model/rental/rental.model';
import { Property } from '@model/property/property.model';
import { RentalService } from '@services/rental.service';
import { PropertyService } from '@services/property.service';
import { ConfirmRentalDialogComponent } from './confirm-rental-dialog.component';

@Component({
  selector: 'app-rental-list',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './rental-list-page.component.html',
  styleUrl: './rental.scss',
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
  readonly labels = RENTAL_LABELS;
  readonly requests = signal<RentalRequest[]>([]);
  readonly contracts = signal<RentalAgreement[]>([]);
  readonly properties = signal<Property[]>([]);
  readonly detail = signal<RentalRequest | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  tab: 'requests' | 'agreements' = 'requests';
  status = this.owner ? 'PENDING' : '';
  propertyId = '';
  roomId = '';
  page = 0;
  totalPages = 0;
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
    this.detail.set(null);
    if (this.tab === 'requests') {
      const filters: Record<string, string> = {};
      if (this.status) filters['status'] = this.status;
      if (this.propertyId) filters['propertyId'] = this.propertyId;
      if (this.roomId) filters['roomId'] = this.roomId;
      this.api
        .requests(this.owner, this.page, filters)
        .pipe(
          takeUntilDestroyed(this.destroy),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (p) => {
            this.requests.set(p.data);
            this.totalPages = p.totalPages;
          },
          error: (e) => this.fail(e),
        });
    } else
      this.api
        .agreements(this.owner, this.page)
        .pipe(
          takeUntilDestroyed(this.destroy),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (p) => {
            this.contracts.set(p.data);
            this.totalPages = p.totalPages;
          },
          error: (e) => this.fail(e),
        });
  }
  filter() {
    this.page = 0;
    this.load();
  }
  view(id: string) {
    this.api
      .request(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({ next: (r) => this.detail.set(r), error: (e) => this.fail(e) });
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
              if (action === 'accept') void this.router.navigate(['/hop-dong', a.id]);
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
