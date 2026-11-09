import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { RoleCode } from '@model/auth/auth.model';
import { Review, ReviewType, REVIEW_LABELS } from '@model/review/review.model';
import { AuthService } from '@services/auth/auth.service';
import { ReviewService } from '@services/review/review.service';
import { ReviewCardComponent } from '@shared/components/review-card/review-card.component';
import { ReviewFormDialogComponent } from '@shared/components/review-form-dialog/review-form-dialog.component';
import {
  ManagementTableComponent,
  ManagementTableColumn,
} from '@shared/components/management-table/management-table.component';
import { ManagementTableCellDirective } from '@shared/components/management-table/management-table-cell.directive';
import { BillingPagerComponent } from '@shared/components/billing-pager/billing-pager.component';

@Component({
  selector: 'app-review-page',
  imports: [
    FormsModule,
    RouterLink,
    ReviewCardComponent,
    ManagementTableComponent,
    ManagementTableCellDirective,
    BillingPagerComponent,
  ],
  templateUrl: './review-page.component.html',
  styleUrl: './review-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewPageComponent {
  private readonly auth = inject(AuthService);
  readonly admin = this.auth.hasAnyRole([RoleCode.ADMIN]);
  readonly owner = this.auth.hasAnyRole([RoleCode.LANDLORD]);
  readonly labels = REVIEW_LABELS;
  readonly types: ReviewType[] = ['ROOM', 'LANDLORD', 'TENANT'];
  readonly type = signal<ReviewType>('ROOM');
  readonly items = signal<Review[]>([]);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly hidden = signal('');
  readonly targetId = signal('');
  readonly columns: ManagementTableColumn<Review>[] = [
    { key: 'review', label: 'Nội dung đánh giá', width: '55%' },
    { key: 'context', label: 'Đối tượng / hợp đồng' },
    { key: 'status', label: 'Hiển thị' },
    { key: 'action', label: 'Thao tác' },
  ];
  readonly rowKey = (r: Review) => r.id;
  private readonly api = inject(ReviewService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((q) => {
      const type = q.get('type') as ReviewType;
      this.type.set(this.types.includes(type) ? type : 'ROOM');
      this.hidden.set(['true', 'false'].includes(q.get('hidden') ?? '') ? q.get('hidden')! : '');
      this.targetId.set(q.get('targetId') ?? '');
      this.page.set(Math.max(0, Math.floor(Number(q.get('page')) || 0)));
      this.load();
    });
    this.destroy.onDestroy(() => this.request?.unsubscribe());
  }
  filter(type = this.type(), hidden = this.hidden(), page = 0) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type, hidden: hidden || null, page, targetId: this.targetId() || null },
      queryParamsHandling: 'merge',
    });
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.items.set([]);
    const mode = this.admin
      ? 'admin'
      : this.owner && this.type() !== 'TENANT'
        ? 'received'
        : 'mine';
    const request =
      !this.admin && !this.owner && this.type() === 'TENANT'
        ? this.api.tenant(this.auth.session()!.id, this.page())
        : this.api.list(
            mode,
            this.type(),
            this.page(),
            this.size(),
            this.hidden(),
            this.targetId(),
          );
    this.request = request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.total.set(r.totalElements);
        this.totalPages.set(r.totalPages);
      },
      error: (e) =>
        this.error.set(e.error?.message || 'Chưa tải được danh sách đánh giá. Vui lòng thử lại.'),
    });
  }
  changeSize(size: number) {
    this.size.set(size);
    if (this.page() === 0) this.load();
    else this.filter(this.type(), this.hidden(), 0);
  }
  action(r: Review) {
    if (!this.admin && !r.canReply) return;
    this.dialogs
      .open(ReviewFormDialogComponent, {
        width: '620px',
        maxWidth: '94vw',
        maxHeight: '90dvh',
        ariaLabel: this.admin ? 'Kiểm duyệt đánh giá' : 'Phản hồi đánh giá',
        data: { action: this.admin ? 'visibility' : 'reply', type: r.type, review: r },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((result) => {
        if (result?.changed) this.success.set('Đã cập nhật đánh giá.');
        this.load();
      });
  }
}
