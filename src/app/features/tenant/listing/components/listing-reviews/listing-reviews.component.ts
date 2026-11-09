import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ListingReviews, ReviewSummary, ReviewTarget } from '@model/review/listing-review.model';
import { ListingReviewService } from '@services/listing/listing-review.service';
import { RouterLink } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { RoleCode } from '@model/auth/auth.model';

interface ReviewState {
  data: ListingReviews | null;
  loading: boolean;
  error: string;
}

@Component({
  selector: 'app-listing-reviews',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './listing-reviews.component.html',
  styleUrl: './listing-reviews.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingReviewsComponent {
  readonly auth = inject(AuthService);
  readonly tenantRole = RoleCode.TENANT;
  readonly entireProperty = signal(false);
  readonly listingId = input.required<string>();
  readonly roomId = input<string | null>(null);
  readonly roomLabel = input('phòng đang chọn');
  readonly landlordSummaryChange = output<ReviewSummary | null>();
  readonly roomSummaryChange = output<ReviewSummary | null>();
  readonly target = signal<ReviewTarget>('ROOM');
  readonly room = signal<ReviewState>({ data: null, loading: true, error: '' });
  readonly landlord = signal<ReviewState>({ data: null, loading: true, error: '' });
  readonly current = computed(() => (this.target() === 'ROOM' ? this.room() : this.landlord()));
  private readonly service = inject(ListingReviewService);
  private readonly requests: Partial<Record<ReviewTarget, Subscription>> = {};

  constructor() {
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
