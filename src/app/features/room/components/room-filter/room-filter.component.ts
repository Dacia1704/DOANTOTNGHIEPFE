import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RoomTypeService } from '@services/room-type.service';
import { AddressService } from '@services/address.service';
import { RoomType } from '@model/room-type/room-type.model';
import { Province } from '@model/address/province.model';
import { Ward } from '@model/address/ward.model';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { RoomRentalStatus, ROOM_STATUS_LABELS } from '@model/room/room.model';

@Component({
  selector: 'app-room-filter',
  imports: [ReactiveFormsModule],
  templateUrl: './room-filter.component.html',
  styleUrl: './room-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomFilterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly addressService = inject(AddressService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() initialParams: RoomQueryParams = {};
  @Output() filterChange = new EventEmitter<RoomQueryParams>();

  readonly roomTypes = signal<RoomType[]>([]);
  readonly provinces = signal<Province[]>([]);
  readonly wards = signal<Ward[]>([]);
  readonly statusLabels = ROOM_STATUS_LABELS;
  readonly statuses = Object.values(RoomRentalStatus);

  readonly form = this.fb.nonNullable.group({
    roomTypeId: [''],
    provinceId: [''],
    wardId: [''],
    rentalStatus: ['' as RoomRentalStatus | ''],
    minPrice: [null as number | null],
    maxPrice: [null as number | null],
  });

  ngOnInit(): void {
    if (this.initialParams) {
      this.form.patchValue({
        roomTypeId: this.initialParams.roomTypeId || '',
        provinceId: this.initialParams.provinceId || '',
        wardId: this.initialParams.wardId || '',
        rentalStatus: this.initialParams.rentalStatus || '',
        minPrice: this.initialParams.minPrice || null,
        maxPrice: this.initialParams.maxPrice || null,
      });
    }

    // Load room types
    this.roomTypeService.getAllRoomTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(types => {
      this.roomTypes.set(types);
    });

    // Load provinces
    this.addressService.getProvinces().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(provinces => {
      this.provinces.set(provinces);
    });

    // Listen to province change to cascade load wards
    this.form.controls.provinceId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(provId => {
      this.form.controls.wardId.setValue('');
      if (provId) {
        this.addressService.getWards(provId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
          this.wards.set(res.items);
        });
      } else {
        this.wards.set([]);
      }
    });
  }

  submitFilter(): void {
    const raw = this.form.getRawValue();
    const query: RoomQueryParams = {
      page: 0,
      roomTypeId: raw.roomTypeId || undefined,
      provinceId: raw.provinceId || undefined,
      wardId: raw.wardId || undefined,
      rentalStatus: raw.rentalStatus || undefined,
      minPrice: raw.minPrice && raw.minPrice > 0 ? raw.minPrice : undefined,
      maxPrice: raw.maxPrice && raw.maxPrice > 0 ? raw.maxPrice : undefined,
    };
    this.filterChange.emit(query);
  }

  resetFilter(): void {
    this.form.reset({
      roomTypeId: '',
      provinceId: '',
      wardId: '',
      rentalStatus: '',
      minPrice: null,
      maxPrice: null,
    });
    this.wards.set([]);
    this.filterChange.emit({ page: 0 });
  }
}
