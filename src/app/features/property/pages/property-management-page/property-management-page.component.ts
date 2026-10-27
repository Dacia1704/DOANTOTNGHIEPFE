import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, finalize, map, switchMap } from 'rxjs';
import { PropertyService } from '@services/property.service';
import { Property, PropertyList } from '@model/property/property.model';
import { Room } from '@model/room/room.model';
import { RoomUtils } from '@shared/utils/room-utils';
import { ImageUtils } from '@shared/utils/image-utils';
import { PropertyFormDialogComponent } from '../../components/property-form-dialog/property-form-dialog.component';
import { PropertyRoomsComponent } from '../../components/property-rooms/property-rooms.component';
import { RoomFormDialogComponent } from '../../../room/components/room-form-dialog/room-form-dialog.component';
import { RoomDetailDialogComponent } from '../../../room/components/room-detail-dialog/room-detail-dialog.component';
import { RoomImageDialogComponent } from '../../../room/components/room-image-dialog/room-image-dialog.component';
import { RoomDeleteDialogComponent } from '../../../room/components/room-delete-dialog/room-delete-dialog.component';

@Component({
  selector: 'app-property-management-page',
  imports: [RouterLink, PropertyRoomsComponent],
  templateUrl: './property-management-page.component.html',
  styleUrl: './property-management-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyManagementPageComponent implements OnInit {
  private readonly properties = inject(PropertyService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<{ page: number; id: string }>();
  readonly result = signal<PropertyList | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly success = signal('');
  readonly selectedId = signal('');
  readonly selected = signal<Property | null>(null);
  readonly roomUtils = RoomUtils;
  readonly imageUtils = ImageUtils;

  ngOnInit(): void {
    this.requests
      .pipe(
        switchMap(({ page, id }) => {
          this.loading.set(true);
          this.error.set('');
          const request: Observable<
            { kind: 'detail'; property: Property } | { kind: 'list'; list: PropertyList }
          > = id
            ? this.properties
                .getById(id)
                .pipe(map((property) => ({ kind: 'detail' as const, property })))
            : this.properties.getMine(page).pipe(map((list) => ({ kind: 'list' as const, list })));
          return request.pipe(
            catchError((err) => {
              this.error.set(
                err.error?.message || 'Không tải được cơ sở cho thuê. Vui lòng thử lại.',
              );
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (response.kind === 'detail') this.selected.set(response.property);
        else this.result.set(response.list);
      });
    this.load(0);
  }
  load(page = this.result()?.page ?? 0): void {
    this.requests.next({ page, id: this.selectedId() });
  }
  select(property: Property): void {
    this.selectedId.set(property.id);
    this.selected.set(null);
    this.success.set('');
    this.load();
  }
  backToList(): void {
    this.selectedId.set('');
    this.selected.set(null);
    this.success.set('');
    this.load();
  }

  openCreate(): void {
    this.dialog
      .open(PropertyFormDialogComponent, {
        width: '1080px',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: '94dvh',
        autoFocus: 'dialog',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((property?: Property) => {
        if (!property) return;
        this.selectedId.set(property.id);
        this.success.set(
          property.rentalMode === 'WHOLE'
            ? 'Đã tạo nhà cho thuê thành công.'
            : 'Đã tạo cơ sở và toàn bộ phòng thành công.',
        );
        this.load(0);
      });
  }
  openAddRoom(): void {
    const property = this.selected();
    if (!property || property.rentalMode === 'WHOLE') return;
    this.dialog
      .open(RoomFormDialogComponent, {
        data: { action: 'create', property },
        width: '780px',
        maxWidth: 'calc(100vw - 24px)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (changed) {
          this.success.set('Đã thêm phòng vào cơ sở.');
          this.load();
        }
      });
  }
  edit(room: Room): void {
    this.dialog
      .open(RoomFormDialogComponent, {
        data: { action: 'edit', room, property: this.selected() },
        width: '780px',
        maxWidth: 'calc(100vw - 24px)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (changed) {
          this.success.set('Đã cập nhật phòng.');
          this.load();
        }
      });
  }
  detail(room: Room): void {
    this.dialog.open(RoomDetailDialogComponent, {
      data: { room },
      width: '720px',
      maxWidth: 'calc(100vw - 24px)',
    });
  }
  images(room: Room): void {
    this.dialog
      .open(RoomImageDialogComponent, {
        data: { room },
        width: '720px',
        maxWidth: 'calc(100vw - 24px)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (changed) this.load();
      });
  }
  remove(room: Room): void {
    const property = this.selected();
    if (!property || property.rooms.length <= 1 || property.rentalMode === 'WHOLE') return;
    this.dialog
      .open(RoomDeleteDialogComponent, {
        data: { room },
        width: '480px',
        maxWidth: 'calc(100vw - 24px)',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (changed) {
          this.success.set('Đã xóa phòng.');
          this.load();
        }
      });
  }
}
