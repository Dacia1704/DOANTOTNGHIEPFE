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
import { PublicListingService } from '@services/public-listing.service';
import { AuthService } from '@services/auth.service';
import { RoleCode } from '@model/auth/auth.model';
import { ChatWidgetService } from '@services/chat-widget.service';
import { ImageUtils } from '@shared/utils/image-utils';
import { RoomUtils } from '@shared/utils/room-utils';
import { BookingDialogComponent } from '../../components/booking-dialog/booking-dialog.component';

@Component({
  selector: 'app-listing-detail-page',
  imports: [DatePipe, RouterLink],
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
  readonly wholeMappingInvalid = computed(() => this.listing()?.rentalMode === 'WHOLE' && this.listing()?.property.rooms.length !== 1);
  readonly selectedRoom = signal<Room | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly activeImage = signal(0);
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

  ngOnInit(): void {
    this.requests
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.error.set('');
          this.listing.set(null);
          this.selectedRoom.set(null);
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
    this.activeImage.update(
      (index) => (index + offset + this.gallery().length) % this.gallery().length,
    );
  }

  book(): void {
    const listing = this.listing();
    const room = this.selectedRoom();
    if (!listing || !room || room.bookingAvailability !== 'AVAILABLE' || this.ownListing() || this.wholeMappingInvalid()) return;
    if (!this.auth.isLoggedIn()) { void this.router.navigate(['/login'], {queryParams:{redirect:this.router.url}}); return; }
    if (!this.auth.hasAnyRole([RoleCode.TENANT])) return;
    this.dialogs.open(BookingDialogComponent, {
      data: { listing, room },
      width: '560px',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: '92dvh',
      autoFocus: 'first-tabbable',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.reload());
  }

  chatWithLandlord(): void {
    const listing = this.listing();
    if (!listing || this.ownListing()) return;
    this.chatWidget.openListing(listing.id);
  }
}
