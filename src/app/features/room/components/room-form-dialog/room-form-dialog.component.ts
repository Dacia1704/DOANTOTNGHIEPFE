import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, forkJoin, of } from 'rxjs';
import { RoomService } from '@services/room.service';
import { RoomTypeService } from '@services/room-type.service';
import { AmenityService } from '@services/amenity.service';
import { PropertyService } from '@services/property.service';
import { Property } from '@model/property/property.model';
import { Room, RoomRentalStatus, ROOM_STATUS_LABELS } from '@model/room/room.model';
import { RoomType } from '@model/room-type/room-type.model';
import { Amenity } from '@model/amenity/amenity.model';

export interface RoomFormData {
  room?: Room;
  property?: Property;
  action: 'create' | 'edit';
}

@Component({
  selector: 'app-room-form-dialog',
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './room-form-dialog.component.html',
  styleUrl: './room-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomFormDialogComponent implements OnInit {
  readonly data = inject<RoomFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RoomFormDialogComponent, boolean>);
  private readonly roomService = inject(RoomService);
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly amenityService = inject(AmenityService);
  private readonly propertyService = inject(PropertyService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly wholeHouse = this.data.property?.rentalMode === 'WHOLE';
  readonly busy = signal(false);
  readonly error = signal('');

  readonly roomTypes = signal<RoomType[]>([]);
  readonly amenities = signal<Amenity[]>([]);
  readonly properties = signal<Property[]>([]);
  readonly catalogsLoading = signal(true);
  readonly catalogsError = signal(false);

  // Selected amenity IDs
  readonly selectedAmenityIds = signal<Set<string>>(new Set());

  // Uploaded files preview for creation mode
  readonly selectedFiles = signal<File[]>([]);
  readonly previewUrls = signal<string[]>([]);

  readonly statuses = Object.values(RoomRentalStatus);
  readonly statusLabels = ROOM_STATUS_LABELS;

  readonly form = this.fb.nonNullable.group({
    roomTypeId: [this.data.room?.roomTypeId ?? '', Validators.required],
    price: [
      this.data.room?.price ?? (null as number | null),
      [Validators.required, Validators.min(1000)],
    ],
    electricityPrice: [
      this.data.room?.electricityPrice ?? (null as number | null),
      [Validators.min(0)],
    ],
    waterPrice: [this.data.room?.waterPrice ?? (null as number | null), [Validators.min(0)]],
    serviceFee: [this.data.room?.serviceFee ?? (null as number | null), [Validators.min(0)]],
    defaultDeposit: [
      this.data.room?.defaultDeposit ?? (null as number | null),
      [Validators.min(0)],
    ],
    areaM2: [
      this.data.room?.areaM2 ?? (null as number | null),
      [Validators.required, Validators.min(1)],
    ],
    maxOccupants: [this.data.room?.maxOccupants ?? 2, [Validators.required, Validators.min(1)]],
    propertyId: [this.data.room?.propertyId ?? this.data.property?.id ?? '', Validators.required],
    roomNumber: [
      this.data.room?.roomNumber ?? '',
      [Validators.required, Validators.maxLength(30), Validators.pattern(/\S/)],
    ],
    floorNumber: [
      this.data.room?.floorNumber ?? (null as number | null),
      [Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    rentalStatus: [this.data.room?.rentalStatus ?? RoomRentalStatus.AVAILABLE, Validators.required],
  });

  ngOnInit(): void {
    // Populate existing amenities if edit
    if (this.data.room?.amenities) {
      const ids = new Set(this.data.room.amenities.map((a) => a.id));
      this.selectedAmenityIds.set(ids);
    }

    this.loadCatalogs();
    this.destroyRef.onDestroy(() => this.previewUrls().forEach((url) => URL.revokeObjectURL(url)));
  }

  loadCatalogs(): void {
    this.catalogsLoading.set(true);
    this.catalogsError.set(false);
    this.error.set('');
    forkJoin({
      types: this.roomTypeService.getAllRoomTypes(),
      amenities: this.amenityService.getAllAmenities(),
      properties: this.data.property
        ? of([this.data.property])
        : this.data.action === 'edit'
          ? of([] as Property[])
          : this.propertyService.getAllMine(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.catalogsLoading.set(false)),
      )
      .subscribe({
        next: (data) => {
          this.roomTypes.set(data.types);
          this.amenities.set(data.amenities);
          this.properties.set(data.properties.filter((p) => p.rentalMode === 'BY_ROOM'));
        },
        error: (err) => {
          this.catalogsError.set(true);
          this.error.set(err.error?.message || 'Không tải được danh mục phòng. Vui lòng thử lại.');
        },
      });
  }

  sharedAddress(): string {
    return (
      this.data.property?.fullAddress ??
      this.data.room?.fullAddress ??
      this.properties().find((p) => p.id === this.form.controls.propertyId.value)?.fullAddress ??
      ''
    );
  }

  toggleAmenity(amenityId: string): void {
    const set = new Set(this.selectedAmenityIds());
    if (set.has(amenityId)) {
      set.delete(amenityId);
    } else {
      set.add(amenityId);
    }
    this.selectedAmenityIds.set(set);
  }

  isAmenitySelected(amenityId: string): boolean {
    return this.selectedAmenityIds().has(amenityId);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    // Limit to 10 files
    const combined = [...this.selectedFiles(), ...files].slice(0, 10);
    this.selectedFiles.set(combined);

    // Create object URLs for previews
    this.previewUrls().forEach((url) => URL.revokeObjectURL(url));
    const urls = combined.map((file) => URL.createObjectURL(file));
    this.previewUrls.set(urls);
  }

  removeFile(index: number): void {
    const files = [...this.selectedFiles()];
    files.splice(index, 1);
    this.selectedFiles.set(files);

    const urls = [...this.previewUrls()];
    URL.revokeObjectURL(urls[index]);
    urls.splice(index, 1);
    this.previewUrls.set(urls);
  }

  submit(): void {
    if (this.busy() || this.catalogsLoading() || this.catalogsError()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;

    const val = this.form.getRawValue();
    const amenityIds = Array.from(this.selectedAmenityIds());

    const requestPayload = {
      roomTypeId: val.roomTypeId,
      price: val.price!,
      electricityPrice: val.electricityPrice,
      waterPrice: val.waterPrice,
      serviceFee: val.serviceFee,
      defaultDeposit: val.defaultDeposit,
      areaM2: val.areaM2!,
      maxOccupants: val.maxOccupants,
      propertyId: val.propertyId,
      roomNumber: val.roomNumber.trim(),
      floorNumber: val.floorNumber,
      rentalStatus: val.rentalStatus,
      amenityIds,
    };

    let req: Observable<unknown>;

    if (this.data.action === 'edit') {
      req = this.roomService.updateRoom(this.data.room!.id, requestPayload);
    } else {
      req = this.roomService.createRoom(requestPayload, this.selectedFiles());
    }

    req
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: () => this.ref.close(true),
        error: (err: { status?: number; error?: { message?: string } }) => {
          this.error.set(
            err.error?.message ||
              (err.status === 403
                ? 'Bạn không có quyền thực hiện thao tác này.'
                : 'Không lưu được phòng. Vui lòng kiểm tra lại thông tin.'),
          );
        },
      });
  }
}
