import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { RoleCode } from '@model/auth/auth.model';
import { RentalAgreement } from '@model/rental/rental.model';
import { ReviewEligibility, ReviewType, REVIEW_LABELS } from '@model/review/review.model';
import { ReviewService } from '@services/review/review.service';
import { AuthService } from '@services/auth/auth.service';
import { ReviewFormDialogComponent } from '../review-form-dialog/review-form-dialog.component';
import { ReportFormDialogComponent } from '../report-form-dialog/report-form-dialog.component';
import { TenantReviewsDialogComponent } from '../tenant-reviews-dialog/tenant-reviews-dialog.component';
@Component({
  selector: 'app-agreement-review-panel',
  imports: [RouterLink],
  templateUrl: './agreement-review-panel.component.html',
  styleUrl: './agreement-review-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgreementReviewPanelComponent {
  readonly agreement = input.required<RentalAgreement>();
  readonly auth = inject(AuthService);
  readonly owner = this.auth.hasAnyRole([RoleCode.LANDLORD]);
  readonly allowed = this.auth.hasAnyRole([RoleCode.TENANT, RoleCode.LANDLORD]);
  readonly types: ReviewType[] = this.owner ? ['TENANT'] : ['ROOM', 'LANDLORD'];
  readonly labels = REVIEW_LABELS;
  readonly eligibility = signal<ReviewEligibility | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  private readonly api = inject(ReviewService);
  private readonly dialogs = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  private request?: Subscription;
  constructor() {
    effect(() => {
      this.agreement();
      this.load();
    });
    this.destroy.onDestroy(() => this.request?.unsubscribe());
  }
  load() {
    if (!this.allowed) return;
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.eligibility.set(null);
    this.request = this.api.eligibility(this.agreement().id).subscribe({
      next: (value) => {
        this.eligibility.set(value);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e.error?.message || 'Chưa kiểm tra được điều kiện đánh giá.');
        this.loading.set(false);
      },
    });
  }
  message(type: ReviewType): string {
    const p = this.eligibility()?.[type];
    if (p?.reviewId) return 'Bạn đã gửi đánh giá cho hợp đồng này.';
    if (p?.canCreate) return 'Chia sẻ trải nghiệm từ hợp đồng thuê của bạn.';
    if (p?.reason === 'CANNOT_REVIEW_SELF') return 'Không thể tự đánh giá chính mình.';
    if (p?.reason === 'NOT_REVIEW_AUTHOR') return 'Bạn không có quyền gửi loại đánh giá này.';
    return 'Có thể đánh giá khi hai bên đã xác nhận hợp đồng và đến ngày bắt đầu thuê.';
  }
  write(type: ReviewType) {
    if (!this.eligibility()?.[type].canCreate || this.loading()) return;
    const id = this.agreement().id;
    this.dialogs
      .open(ReviewFormDialogComponent, {
        width: '580px',
        maxWidth: '94vw',
        maxHeight: '90dvh',
        ariaLabel: 'Viết đánh giá từ hợp đồng',
        data: {
          action: 'create',
          type,
          agreementId: id,
          context: `${this.agreement().agreementCode} · ${this.agreement().propertyName}`,
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        if (id === this.agreement().id) this.load();
      });
  }
  report() {
    const a = this.agreement();
    if (!a.landlordId || this.owner) return;
    this.dialogs.open(ReportFormDialogComponent, {
      width: '640px',
      maxWidth: '94vw',
      maxHeight: '90dvh',
      ariaLabel: 'Báo cáo chủ trọ',
      data: { targetType: 'LANDLORD', targetId: a.landlordId, targetName: a.landlordName },
    });
  }
  viewTenant() {
    const a = this.agreement();
    if (a.tenantId)
      this.dialogs.open(TenantReviewsDialogComponent, {
        width: '680px',
        maxWidth: '94vw',
        maxHeight: '90dvh',
        ariaLabel: 'Đánh giá về người thuê',
        data: { id: a.tenantId, name: a.tenantName },
      });
  }
}
