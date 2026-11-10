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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, from, switchMap } from 'rxjs';
import { RentalAgreement, RENTAL_LABELS } from '@model/rental/rental.model';
import { RentalService } from '@services/rental/rental.service';
import { AuthService } from '@services/auth/auth.service';
import { RoleCode } from '@model/auth/auth.model';
import { RoomUtils } from '@shared/utils/room-utils';
import { ConfirmRentalDialogComponent } from './confirm-rental-dialog.component';
import { ContractPdfViewerComponent } from './contract-pdf-viewer.component';
import { AgreementReviewPanelComponent } from '@shared/components/agreement-review-panel/agreement-review-panel.component';

@Component({
  selector: 'app-agreement-page',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ContractPdfViewerComponent,
    AgreementReviewPanelComponent,
  ],
  templateUrl: './agreement-page.component.html',
  styleUrl: './agreement-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgreementPageComponent implements OnInit {
  readonly owner = inject(AuthService).primaryRole() === RoleCode.LANDLORD;
  readonly backLink = this.owner ? '/quan-ly-dat-phong' : '/yeu-cau-thue';
  private readonly api = inject(RentalService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private readonly dialogs = inject(MatDialog);
  readonly agreement = signal<RentalAgreement | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly pdfLoading = signal(false);
  readonly busy = signal(false);
  readonly pdfBlob = signal<Blob | null>(null);
  readonly pdfLink = signal('');
  readonly pdfRendered = signal(false);
  readonly labels = RENTAL_LABELS;
  readonly utils = RoomUtils;
  accepted = false;
  private id = '';
  private objectUrl = '';
  private displayedHash = '';
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private polls = 0;
  private dead = false;
  ngOnInit() {
    this.destroy.onDestroy(() => {
      this.dead = true;
      clearTimeout(this.timer);
      this.clearPdf();
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((p) => {
      this.id = p.get('id') ?? '';
      this.polls = 0;
      this.accepted = false;
      this.clearPdf();
      this.load();
    });
  }
  load() {
    clearTimeout(this.timer);
    const id = this.id;
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    this.api
      .agreement(id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (generation === this.generation) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (a) => {
          if (generation !== this.generation) return;
          this.agreement.set(a);
          if (a.canDownloadPdf && a.pdfSha256 !== this.displayedHash) this.loadPdf(a);
          if (
            a.status === 'PENDING_CONFIRMATION' &&
            ['PENDING', 'PROCESSING'].includes(a.pdfStatus) &&
            this.polls++ < 24
          )
            this.timer = setTimeout(() => this.load(), 5000);
        },
        error: (e) => {
          if (generation === this.generation)
            this.error.set(e.error?.message || 'Không tải được hợp đồng. Vui lòng thử lại.');
        },
      });
  }
  loadPdf(a: RentalAgreement) {
    this.clearPdf();
    this.pdfLoading.set(true);
    const generation = this.generation;
    this.api
      .pdf(a.id)
      .pipe(
        switchMap((blob) => from(this.verifyPdf(blob, a.pdfSha256))),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (generation === this.generation) this.pdfLoading.set(false);
        }),
      )
      .subscribe({
        next: (blob) => {
          if (this.dead || generation !== this.generation) return;
          this.objectUrl = URL.createObjectURL(blob);
          this.displayedHash = a.pdfSha256 ?? '';
          this.pdfLink.set(this.objectUrl);
          this.pdfBlob.set(blob);
        },
        error: () => {
          if (generation === this.generation)
            this.error.set('Không tải/xác minh được PDF. Vui lòng tải lại trước khi xác nhận.');
        },
      });
  }
  private async verifyPdf(blob: Blob, expected: string | null): Promise<Blob> {
    const bytes = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (hash !== expected) throw new Error('CONTRACT_CHANGED');
    return blob;
  }
  get canConfirm() {
    return (
      !!this.agreement()?.canConfirm &&
      !!this.displayedHash &&
      !!this.pdfBlob() &&
      this.pdfRendered() &&
      this.accepted &&
      !this.busy() &&
      !this.loading()
    );
  }
  action(action: 'confirm' | 'decline' | 'checkout') {
    if (this.busy() || (action === 'confirm' && !this.canConfirm)) return;
    const a = this.agreement();
    if (!a) return;
    this.dialogs
      .open(ConfirmRentalDialogComponent, {
        width: '460px',
        maxWidth: '94vw',
        data: {
          title:
            action === 'confirm'
              ? 'Xác nhận thuê phòng'
              : action === 'decline'
                ? 'Từ chối hợp đồng'
                : 'Xác nhận đã nhận bàn giao phòng',
          message:
            action === 'confirm'
              ? `Bạn đồng ý nội dung hợp đồng giữa ${a.landlordName} và ${a.tenantName} đã hiển thị?`
              : action === 'checkout'
                ? 'Chỉ tiếp tục khi đã hoàn tất bàn giao và nhận lại phòng. Phòng sẽ được mở đặt lại.'
                : 'Phòng sẽ được giải phóng để nhận yêu cầu mới.',
        },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((ok) => {
        if (!ok || this.busy()) return;
        this.busy.set(true);
        this.api
          .agreementAction(a.id, action, this.displayedHash)
          .pipe(
            takeUntilDestroyed(this.destroy),
            finalize(() => this.busy.set(false)),
          )
          .subscribe({
            next: () => {
              this.accepted = false;
              this.load();
            },
            error: (e) => {
              this.load();
              this.error.set(e.error?.message || 'Không cập nhật được hợp đồng.');
            },
          });
      });
  }
  download() {
    if (!this.objectUrl) return;
    const link = document.createElement('a');
    link.href = this.objectUrl;
    link.download = `${this.agreement()?.agreementCode ?? 'hop-dong'}.pdf`;
    link.click();
  }
  private clearPdf() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = '';
    this.displayedHash = '';
    this.pdfBlob.set(null);
    this.pdfLink.set('');
    this.pdfRendered.set(false);
    this.pdfLoading.set(false);
  }
}
