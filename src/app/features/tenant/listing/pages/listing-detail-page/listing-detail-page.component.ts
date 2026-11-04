import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, finalize, switchMap } from 'rxjs';
import { PublicListing } from '@model/public-listing/public-listing.model';
import { Room, RoomRentalStatus } from '@model/room/room.model';
import { PublicListingService } from '@services/listing/public-listing.service';
import { AuthService } from '@services/auth/auth.service';
import { RoleCode } from '@model/auth/auth.model';
import { ChatWidgetService } from '@services/chat/chat-widget.service';
import { ImageUtils } from '@shared/utils/image-utils';
import { RoomUtils } from '@shared/utils/room-utils';
import { BookingDialogComponent } from '../../components/booking-dialog/booking-dialog.component';
import { PropertyLocationComponent } from '@shared/components/property-location/property-location.component';
import { ReviewSummary } from '@model/review/listing-review.model';
import { ListingReviewsComponent } from '../../components/listing-reviews/listing-reviews.component';
import { ListingRatingComponent } from '../../components/listing-reviews/listing-rating.component';

const AMENITY_SUBTITLES: [RegExp, string][] = [
  [/wifi|wi-fi|internet/, 'Kết nối internet phục vụ học tập, làm việc và giải trí.'],
  [/thang may/, 'Di chuyển thuận tiện giữa các tầng trong tòa nhà.'],
  [/may giat|giat say|giat phoi/, 'Thuận tiện giặt giũ và chăm sóc quần áo hằng ngày.'],
  [/camera|cctv/, 'Hỗ trợ quan sát và theo dõi an ninh tại khu vực lắp đặt.'],
  [/van tay|khoa|kiem soat ra vao/, 'Hỗ trợ kiểm soát người ra vào và bảo vệ không gian sống.'],
  [
    /pccc|phong chay|bao chay|chua chay/,
    'Trang bị phục vụ an toàn cháy nổ; kiểm tra khi đến xem trọ.',
  ],
  [/thu cung|cho meo/, 'Trao đổi với chủ trọ về loại thú cưng và quy định chăm sóc.'],
  [/de xe|giu xe|bai xe|ham xe/, 'Có khu vực để phương tiện; xác nhận sức chứa và phí gửi xe.'],
  [/dieu hoa|may lanh/, 'Chủ động điều chỉnh nhiệt độ cho không gian nghỉ ngơi.'],
  [/nha ve sinh|phong tam|wc/, 'Phục vụ nhu cầu tắm giặt và sinh hoạt cá nhân hằng ngày.'],
  [/nong lanh|nuoc nong/, 'Thuận tiện sử dụng nước nóng trong sinh hoạt cá nhân.'],
  [/bep|nau an/, 'Chủ động chuẩn bị bữa ăn và sắp xếp sinh hoạt hằng ngày.'],
  [/tu lanh/, 'Bảo quản thực phẩm và đồ uống cho những bữa ăn tại nhà.'],
  [/giuong|nem/, 'Bố trí chỗ nghỉ ngơi, giúp thuận tiện hơn khi chuyển đến.'],
  [/tu quan ao|tu do/, 'Sắp xếp quần áo và đồ dùng cá nhân gọn gàng, ngăn nắp.'],
  [/ban cong/, 'Thêm không gian đón gió và thư giãn bên ngoài phòng.'],
  [/cua so/, 'Đón ánh sáng tự nhiên và hỗ trợ thông thoáng cho căn phòng.'],
  [/san thuong|san vuon/, 'Bổ sung không gian ngoài trời cho sinh hoạt và thư giãn.'],
  [/ban hoc|ban lam viec/, 'Bố trí góc học tập và làm việc ngay tại nơi ở.'],
  [/tivi|truyen hinh/, 'Đáp ứng nhu cầu xem tin tức và giải trí tại nhà.'],
  [/tu do gio|gio giac/, 'Thuận tiện sắp xếp lịch sinh hoạt; xác nhận quy định ra vào.'],
];

@Component({
  selector: 'app-listing-detail-page',
  imports: [
    DatePipe,
    RouterLink,
    PropertyLocationComponent,
    ListingReviewsComponent,
    ListingRatingComponent,
  ],
  templateUrl: './listing-detail-page.component.html',
  styleUrl: './listing-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingDetailPageComponent implements OnInit {
  private readonly service = inject(PublicListingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  readonly auth = inject(AuthService);
  readonly tenantRole = RoleCode.TENANT;
  get canContactSupport(): boolean {
    return !this.auth.isLoggedIn() || this.auth.hasAnyRole([RoleCode.TENANT, RoleCode.LANDLORD]);
  }
  readonly chatWidget = inject(ChatWidgetService);
  private readonly requests = new Subject<string>();
  readonly listing = signal<PublicListing | null>(null);
  readonly wholeMappingInvalid = computed(
    () => this.listing()?.rentalMode === 'WHOLE' && this.listing()?.property.rooms.length !== 1,
  );
  readonly selectedRoom = signal<Room | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly activeImage = signal(0);
  readonly shareMessage = signal('');
  readonly landlordRating = signal<ReviewSummary | null>(null);
  readonly roomRating = signal<ReviewSummary | null>(null);
  readonly phone = signal<string | null>(null);
  readonly phoneLoading = signal(false);
  readonly phoneError = signal('');
  readonly phoneUnavailable = signal(false);
  private phoneRequest = 0;
  readonly images = ImageUtils;
  readonly utils = RoomUtils;
  readonly available = RoomRentalStatus.AVAILABLE;
  readonly gallery = computed(() => {
    const images = [
      ...(this.listing()?.property.images ?? []),
      ...(this.selectedRoom()?.images ?? []),
    ];
    return [
      ...new Map(images.filter((image) => image.url).map((image) => [image.url, image])).values(),
    ];
  });
  readonly ownListing = computed(
    () => !!this.auth.session()?.id && this.selectedRoom()?.landlordId === this.auth.session()?.id,
  );

  amenitySubtitle(name: string, privateAmenity = false): string {
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase();
    return (
      AMENITY_SUBTITLES.find(([pattern]) => pattern.test(normalized))?.[1] ??
      (privateAmenity
        ? 'Tiện ích đi kèm không gian thuê, phục vụ sinh hoạt hằng ngày.'
        : 'Tiện ích tại cơ sở, bổ sung sự thuận tiện trong quá trình lưu trú.')
    );
  }

  ngOnInit(): void {
    this.requests
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.error.set('');
          this.listing.set(null);
          this.selectedRoom.set(null);
          this.landlordRating.set(null);
          this.roomRating.set(null);
          this.phoneRequest++;
          this.phone.set(null);
          this.phoneLoading.set(false);
          this.phoneError.set('');
          this.phoneUnavailable.set(false);
          return this.service.getById(id).pipe(
            catchError((err) => {
              this.error.set(
                err?.status === 404
                  ? 'Tin đăng đã ẩn, hết hạn hoặc không còn tồn tại.'
                  : err?.error?.message || 'Không tải được thông tin trọ. Vui lòng thử lại.',
              );
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe((listing) => {
        this.listing.set(listing);
        const rooms = listing.property.rooms;
        this.selectRoom(
          rooms.find((room) => room.id === this.route.snapshot.queryParamMap.get('phong')) ??
            rooms.find((room) => room.bookingAvailability === 'AVAILABLE') ??
            rooms[0] ??
            null,
        );
        if (this.route.snapshot.fragment === 'dat-phong') {
          setTimeout(() =>
            document.getElementById('dat-phong')?.scrollIntoView({ block: 'start' }),
          );
        } else window.scrollTo({ top: 0 });
      });
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((params) => this.requests.next(params.get('id') ?? ''));
  }

  reload(): void {
    this.requests.next(this.route.snapshot.paramMap.get('id') ?? '');
  }
  selectRoom(room: Room | null): void {
    this.selectedRoom.set(room);
    this.activeImage.set(0);
  }
  changeImage(offset: number): void {
    if (!this.gallery().length) return;
    this.activeImage.update(
      (index) => (index + offset + this.gallery().length) % this.gallery().length,
    );
  }

  async share(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.shareMessage.set('Đã sao chép liên kết');
    } catch {
      this.shareMessage.set('Chưa thể sao chép. Bạn có thể sao chép địa chỉ trên trình duyệt.');
    }
  }

  scrollToRooms(): void {
    document.getElementById('chon-phong')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  revealPhone(): void {
    const listing = this.listing();
    if (!listing || this.phoneLoading() || this.phone() || this.phoneUnavailable()) return;
    const request = ++this.phoneRequest;
    this.phoneLoading.set(true);
    this.phoneError.set('');
    this.service
      .revealPhone(listing.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (phone) => {
          if (request !== this.phoneRequest) return;
          this.phoneLoading.set(false);
          this.phone.set(phone);
          this.phoneUnavailable.set(!phone);
        },
        error: () => {
          if (request !== this.phoneRequest) return;
          this.phoneLoading.set(false);
          this.phoneError.set('Chưa thể lấy số điện thoại. Vui lòng thử lại.');
        },
      });
  }

  book(): void {
    const listing = this.listing();
    const room = this.selectedRoom();
    if (
      !listing ||
      !room ||
      room.bookingAvailability !== 'AVAILABLE' ||
      this.ownListing() ||
      this.wholeMappingInvalid()
    )
      return;
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
      return;
    }
    if (!this.auth.hasAnyRole([RoleCode.TENANT])) return;
    this.dialogs
      .open(BookingDialogComponent, {
        data: { listing, room },
        width: '560px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: '92dvh',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.reload());
  }

  chatWithLandlord(): void {
    const listing = this.listing();
    if (!listing || this.ownListing()) return;
    this.chatWidget.openListing(listing.id);
  }
}
