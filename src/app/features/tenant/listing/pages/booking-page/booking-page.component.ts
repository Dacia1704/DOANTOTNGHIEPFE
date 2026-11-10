import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, finalize } from 'rxjs';
import { PublicListingService } from '@services/listing/public-listing.service';
import { PublicListing } from '@model/public-listing/public-listing.model';
import { Room } from '@model/room/room.model';
import { AuthService } from '@services/auth/auth.service';
import { BookingDialogComponent } from '../../components/booking-dialog/booking-dialog.component';

@Component({
  selector: 'app-booking-page',
  imports: [RouterLink, BookingDialogComponent],
  template: `<main class="booking-page">
    <nav aria-label="Đường dẫn">
      <a routerLink="/">Trang chủ</a><span>›</span
      ><a [routerLink]="['/tro', listingId]">Chi tiết phòng trọ</a><span>›</span
      ><span>Gửi yêu cầu thuê</span>
    </nav>
    <header>
      <span class="eyebrow"
        ><span class="material-symbols-outlined" aria-hidden="true">verified_user</span> Kết nối
        trực tiếp với chủ trọ</span
      >
      <h1>Gửi yêu cầu thuê phòng trọ</h1>
      <p>Điền thông tin và nguyện vọng của bạn để chủ trọ xem xét, liên hệ và lập hợp đồng.</p>
    </header>
    @if (loading()) {
      <p role="status">Đang tải thông tin phòng…</p>
    }
    @if (error()) {
      <section class="state" role="alert">
        <h2>Chưa thể đặt phòng</h2>
        <p>{{ error() }}</p>
        <a class="btn-primary" [routerLink]="['/tro', listingId]">Quay lại chọn phòng</a>
      </section>
    }
    @if (data(); as booking) {
      <app-booking-dialog [data]="booking" />
    }
  </main>`,
  styles: [
    `
      :host {
        display: block;
        background: var(--background);
      }
      .booking-page {
        max-width: 1200px;
        margin: auto;
        padding: 28px 24px 64px;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 28px;
      }
      a {
        color: var(--primary);
      }
      header {
        margin-bottom: 30px;
      }
      h1 {
        font-size: 32px;
        line-height: 1.4;
        margin: 12px 0;
      }
      p {
        color: var(--text-secondary);
        line-height: 1.7;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: color-mix(in srgb, var(--primary) 9%, var(--surface));
        color: var(--primary);
        border-radius: 20px;
        padding: 7px 12px;
        font-size: 12px;
      }
      .eyebrow span {
        font-size: 18px;
      }
      .state {
        background: var(--surface);
        padding: 32px;
        border-radius: 20px;
      }
      @media (max-width: 600px) {
        .booking-page {
          padding: 20px 16px 40px;
        }
        h1 {
          font-size: 25px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicListingService);
  private readonly destroy = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  readonly data = signal<{ listing: PublicListing; room: Room } | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  listingId = '';
  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.listingId = params.get('id') ?? '';
          this.loading.set(true);
          this.data.set(null);
          this.error.set('');
          return this.api.getById(this.listingId).pipe(finalize(() => this.loading.set(false)));
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (listing) => {
          const room = listing.property.rooms.find(
            (room) => room.id === this.route.snapshot.paramMap.get('roomId'),
          );
          if (listing.rentalMode === 'WHOLE' && listing.property.rooms.length !== 1) {
            this.error.set(
              'Thông tin đơn vị thuê nguyên căn chưa hợp lệ. Vui lòng liên hệ chủ trọ.',
            );
            return;
          }
          if (room?.landlordId === this.auth.session()?.id) {
            this.error.set('Bạn đang xem tin đăng của chính mình.');
            return;
          }
          if (!room || room.bookingAvailability !== 'AVAILABLE') {
            this.error.set(
              'Phòng đã được giữ, đã thuê hoặc không còn trong tin đăng. Vui lòng chọn phòng khác.',
            );
            return;
          }
          this.data.set({ listing, room });
        },
        error: () =>
          this.error.set('Không tải được tin đăng. Vui lòng quay lại hoặc thử tải lại trang.'),
      });
  }
}
