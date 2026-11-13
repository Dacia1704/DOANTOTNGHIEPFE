import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import {
  EMPTY,
  Subscription,
  concatMap,
  defaultIfEmpty,
  expand,
  filter,
  finalize,
  from,
  map,
  reduce,
  switchMap,
  take,
} from 'rxjs';
import { ListingReviews, ReviewSummary, ReviewTarget } from '@model/review/listing-review.model';
import { ListingReviewService } from '@services/listing/listing-review.service';
import { AuthService } from '@services/auth/auth.service';
import { RoleCode } from '@model/auth/auth.model';
import { RentalAgreement } from '@model/rental/rental.model';
import { RentalService } from '@services/rental/rental.service';
import { ReviewService } from '@services/review/review.service';
import { ReviewFormDialogComponent } from '@shared/components/review-form-dialog/review-form-dialog.component';

interface ReviewState {
  data: ListingReviews | null;
  loading: boolean;
  error: string;
}

@Component({
  selector: 'app-listing-reviews',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './listing-reviews.component.html',
  styleUrl: './listing-reviews.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingReviewsComponent {
  readonly auth = inject(AuthService);
  readonly entireProperty = signal(false);
  readonly listingId = input.required<string>();
  readonly roomId = input<string | null>(null);
  readonly propertyRoomIds = input<string[]>([]);
  readonly landlordId = input<string | null>(null);
  readonly roomLabel = input('phòng đang chọn');
  readonly landlordSummaryChange = output<ReviewSummary | null>();
  readonly roomSummaryChange = output<ReviewSummary | null>();
  readonly target = signal<ReviewTarget>('ROOM');
  readonly room = signal<ReviewState>({ data: null, loading: true, error: '' });
  readonly landlord = signal<ReviewState>({ data: null, loading: true, error: '' });
  readonly current = computed(() => (this.target() === 'ROOM' ? this.room() : this.landlord()));
  readonly checkingContract = signal(false);
  readonly reviewDialogOpen = signal(false);
  readonly writeNotice = signal('');
  private readonly service = inject(ListingReviewService);
  private readonly rentals = inject(RentalService);
  private readonly reviews = inject(ReviewService);
  private readonly dialogs = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  private writeRequest?: Subscription;
  private readonly requests: Partial<Record<ReviewTarget, Subscription>> = {};

  constructor() {
    effect(() => {
      this.listingId();
      this.roomId();
      this.propertyRoomIds();
      this.landlordId();
      this.target();
      this.entireProperty();
      this.auth.session();
      this.writeRequest?.unsubscribe();
      this.writeNotice.set('');
    });
    this.destroy.onDestroy(() => this.writeRequest?.unsubscribe());
    effect((onCleanup) => {
      this.fetch('LANDLORD', this.listingId(), null, 0);
      onCleanup(() => this.requests.LANDLORD?.unsubscribe());
    });
    effect((onCleanup) => {
      this.fetch('ROOM', this.listingId(), this.entireProperty() ? null : this.roomId(), 0);
      onCleanup(() => this.requests.ROOM?.unsubscribe());
    });
  }

  show(target: ReviewTarget): void {
    this.target.set(target);
    document.getElementById('danh-gia')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  loadMore(): void {
    const current = this.current();
    if (current.loading) return;
    const next = current.data ? current.data.reviews.currentPage + 1 : 0;
    this.fetch(this.target(), this.listingId(), this.entireProperty() ? null : this.roomId(), next);
  }

  writeReview(): void {
    if (this.checkingContract() || this.reviewDialogOpen()) return;
    this.writeNotice.set('');
    if (!this.auth.hasAnyRole([RoleCode.TENANT])) {
      this.writeNotice.set('Bạn cần có hợp đồng thuê để đánh giá');
      return;
    }
    const type = this.target();
    const listingId = this.listingId();
    const selectedRoom = this.entireProperty() ? null : this.roomId();
    const roomIds = new Set(this.propertyRoomIds());
    const landlordId = this.landlordId();
    let hasContract = false;
    let alreadyReviewed = false;
    this.checkingContract.set(true);
    this.writeRequest = this.rentals
      .agreements(false, 0, 50)
      .pipe(
        expand((page) =>
          page.currentPage + 1 < page.totalPages
            ? this.rentals.agreements(false, page.currentPage + 1, 50)
            : EMPTY,
        ),
        reduce(
          (agreements, page) => [
            ...agreements,
            ...page.data.filter((agreement) =>
              type === 'LANDLORD'
                ? !!landlordId && agreement.landlordId === landlordId
                : selectedRoom
                  ? agreement.roomId === selectedRoom
                  : roomIds.has(agreement.roomId),
            ),
          ],
          [] as RentalAgreement[],
        ),
        switchMap((agreements) => {
          hasContract = agreements.length > 0;
          return from(agreements).pipe(
            concatMap((agreement) =>
              this.reviews.eligibility(agreement.id).pipe(
                map((eligibility) => {
                  alreadyReviewed ||= !!eligibility[type].reviewId;
                  return { agreement, permission: eligibility[type] };
                }),
              ),
            ),
            filter((result) => result.permission.canCreate),
            take(1),
            defaultIfEmpty(null),
          );
        }),
        takeUntilDestroyed(this.destroy),
        finalize(() => this.checkingContract.set(false)),
      )
      .subscribe({
        next: (result) => {
          if (!result) {
            this.writeNotice.set(
              !hasContract
                ? 'Bạn cần có hợp đồng thuê để đánh giá'
                : alreadyReviewed
                  ? 'Bạn đã gửi đánh giá cho hợp đồng thuê này.'
                  : 'Bạn chỉ có thể đánh giá khi hai bên đã xác nhận hợp đồng và đến ngày bắt đầu thuê.',
            );
            return;
          }
          const agreement = result.agreement;
          this.reviewDialogOpen.set(true);
          this.dialogs
            .open(ReviewFormDialogComponent, {
              width: '580px',
              maxWidth: '94vw',
              maxHeight: '90dvh',
              ariaLabel: 'Viết đánh giá',
              data: {
                action: 'create',
                type,
                agreementId: agreement.id,
                context: `${agreement.agreementCode} · ${agreement.propertyName} · ${agreement.roomNumber}`,
              },
            })
            .afterClosed()
            .pipe(takeUntilDestroyed(this.destroy))
            .subscribe((value) => {
              this.reviewDialogOpen.set(false);
              if (value?.changed && listingId === this.listingId()) {
                this.fetch('ROOM', listingId, this.entireProperty() ? null : this.roomId(), 0);
                this.fetch('LANDLORD', listingId, null, 0);
              }
            });
        },
        error: () =>
          this.writeNotice.set('Chưa kiểm tra được điều kiện đánh giá. Vui lòng thử lại.'),
      });
  }

  private fetch(target: ReviewTarget, id: string, roomId: string | null, page: number): void {
    this.requests[target]?.unsubscribe();
    const state = target === 'ROOM' ? this.room : this.landlord;
    const summary = target === 'ROOM' ? this.roomSummaryChange : this.landlordSummaryChange;
    const previous = page > 0 ? state().data : null;
    state.set({ data: previous, loading: true, error: '' });
    if (page === 0) summary.emit(null);
    this.requests[target] = this.service.get(id, target, roomId, page).subscribe({
      next: (data) => {
        state.set({
          data: previous
            ? {
                ...data,
                reviews: {
                  ...data.reviews,
                  data: [...previous.reviews.data, ...data.reviews.data],
                },
              }
            : data,
          loading: false,
          error: '',
        });
        summary.emit(data.summary);
      },
      error: () =>
        state.set({
          data: previous,
          loading: false,
          error: 'Chưa tải được đánh giá. Vui lòng thử lại.',
        }),
    });
  }
}
