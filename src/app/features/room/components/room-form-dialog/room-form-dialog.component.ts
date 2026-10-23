import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { RoomService } from '@services/room.service';
import { RoomTypeService } from '@services/room-type.service';
import { AmenityService } from '@services/amenity.service';
import { AddressService } from '@services/address.service';
import { Room, RoomRentalStatus, ROOM_STATUS_LABELS } from '@model/room/room.model';
import { RoomType } from '@model/room-type/room-type.model';
import { Amenity } from '@model/amenity/amenity.model';
import { Province } from '@model/address/province.model';
import { Ward } from '@model/address/ward.model';

export interface RoomFormData {
  room?: Room;
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
  private readonly addressService = inject(AddressService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly busy = signal(false);
  readonly error = signal('');

  readonly roomTypes = signal<RoomType[]>([]);
  readonly amenities = signal<Amenity[]>([]);
  readonly provinces = signal<Province[]>([]);
  readonly wards = signal<Ward[]>([]);

  // Selected amenity IDs
  readonly selectedAmenityIds = signal<Set<string>>(new Set());

  // Uploaded files preview for creation mode
  readonly selectedFiles = signal<File[]>([]);
  readonly previewUrls = signal<string[]>([]);

  readonly statuses = Object.values(RoomRentalStatus);
  readonly statusLabels = ROOM_STATUS_LABELS;

  readonly form = this.fb.nonNullable.group({
    roomTypeId: [this.data.room?.roomTypeId ?? '', Validators.required],
    price: [this.data.room?.price ?? null as number | null, [Validators.required, Validators.min(1000)]],
    electricityPrice: [this.data.room?.electricityPrice ?? 3500, [Validators.min(0)]],
    waterPrice: [this.data.room?.waterPrice ?? 100000, [Validators.min(0)]],
    serviceFee: [this.data.room?.serviceFee ?? 50000, [Validators.min(0)]],
    defaultDeposit: [this.data.room?.defaultDeposit ?? 0, [Validators.min(0)]],
    areaM2: [this.data.room?.areaM2 ?? null as number | null, [Validators.required, Validators.min(1)]],
    maxOccupants: [this.data.room?.maxOccupants ?? 2, [Validators.required, Validators.min(1)]],
    provinceId: [this.data.room?.provinceId ?? '', Validators.required],
    wardId: [this.data.room?.wardId ?? '', Validators.required],
    addressLine: [this.data.room?.addressLine ?? '', [Validators.required, Validators.maxLength(255)]],
    latitude: [this.data.room?.latitude ?? null as number | null],
    longitude: [this.data.room?.longitude ?? null as number | null],
    rentalStatus: [this.data.room?.rentalStatus ?? RoomRentalStatus.AVAILABLE, Validators.required],
  });

  ngOnInit(): void {
    // Populate existing amenities if edit
    if (this.data.room?.amenities) {
      const ids = new Set(this.data.room.amenities.map(a => a.id));
      this.selectedAmenityIds.set(ids);
    }

    // Load room types
    this.roomTypeService.getAllRoomTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(types => {
      this.roomTypes.set(types);
    });

    // Load amenities
    this.amenityService.getAllAmenities().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(amenities => {
      this.amenities.set(amenities);
    });

    // Load provinces
    this.addressService.getProvinces().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(provinces => {
      this.provinces.set(provinces);
      const curProvId = this.data.room?.provinceId;
      if (curProvId) {
        this.loadWards(curProvId, this.data.room?.wardId);
      }
    });

    // Listen to province changes
    this.form.controls.provinceId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(provId => {
      if (provId) {
        this.loadWards(provId);
      } else {
        this.wards.set([]);
        this.form.controls.wardId.setValue('');
      }
    });
  }

  private loadWards(provinceId: string, preselectWardId?: string): void {
    this.addressService.getWards(provinceId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
      this.wards.set(res.items);
      if (preselectWardId) {
        this.form.controls.wardId.setValue(preselectWardId);
      }
    });
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
    const urls = combined.map(file => URL.createObjectURL(file));
    this.previewUrls.set(urls);
  }

  removeFile(index: number): void {
    const files = [...this.selectedFiles()];
    files.splice(index, 1);
    this.selectedFiles.set(files);

    const urls = [...this.previewUrls()];
    urls.splice(index, 1);
    this.previewUrls.set(urls);
  }

  submit(): void {
    if (this.busy()) return;
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
      electricityPrice: val.electricityPrice ?? 0,
      waterPrice: val.waterPrice ?? 0,
      serviceFee: val.serviceFee ?? 0,
      defaultDeposit: val.defaultDeposit ?? 0,
      areaM2: val.areaM2!,
      maxOccupants: val.maxOccupants,
      provinceId: val.provinceId,
      wardId: val.wardId,
      addressLine: val.addressLine.trim(),
      latitude: val.latitude ?? undefined,
      longitude: val.longitude ?? undefined,
      rentalStatus: val.rentalStatus,
      amenityIds,
    };

    let req: Observable<unknown>;

    if (this.data.action === 'edit') {
      req = this.roomService.updateRoom(this.data.room!.id, requestPayload);
    } else {
      req = this.roomService.createRoom(requestPayload, this.selectedFiles());
    }

    req.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.busy.set(false);
        this.ref.disableClose = false;
      }),
    ).subscribe({
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
