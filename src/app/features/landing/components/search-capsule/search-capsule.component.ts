import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AmenityService } from '@core/services/amenity.service';
import { AddressService } from '@core/services/address.service';
import { Amenity } from '@model/amenity/amenity.model';
import { Province } from '@model/address/province.model';
import { Ward } from '@model/address/ward.model';
import { RoomQueryParams } from '@model/room/request/room-query-params';
import { RoomRentalStatus } from '@model/room/room.model';
import { CategoryBarComponent } from '../category-bar/category-bar.component';

@Component({
  selector: 'app-search-capsule',
  imports: [FormsModule, CategoryBarComponent],
  templateUrl: './search-capsule.component.html',
  styleUrl: './search-capsule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchCapsuleComponent implements OnInit {
  private readonly amenityService = inject(AmenityService);
  private readonly addressService = inject(AddressService);
  @Output() readonly search = new EventEmitter<RoomQueryParams>();
  @Output() readonly locationLabels = new EventEmitter<{ province: string; ward: string }>();
  @Input() searching = false;

  readonly amenities = signal<Amenity[]>([]);
  readonly provinces = signal<Province[]>([]);
  readonly wards = signal<Ward[]>([]);
  readonly location = signal('');
  readonly provinceId = signal('');
  readonly wardId = signal('');
  readonly priceRange = signal('all');
  readonly roomTypeName = signal('');
  readonly selectedAmenityNames = signal<string[]>([]);
  readonly showAmenities = signal(false);
  readonly rentalStatus = signal<RoomRentalStatus | ''>(RoomRentalStatus.AVAILABLE);
  @Input() set appliedFilters(query: RoomQueryParams) {
    this.provinceId.set(query.provinceId ?? '');
    this.wardId.set(query.wardId ?? '');
    this.roomTypeName.set(query.roomTypeName ?? '');
    this.selectedAmenityNames.set(query.amenityNames ?? []);
    this.rentalStatus.set(query.rentalStatus ?? '');
    this.priceRange.set(this.priceRangeFor(query.minPrice, query.maxPrice));
  }

  ngOnInit(): void {
    this.amenityService.getAllAmenities().subscribe({
      next: (values) => this.amenities.set(values),
      error: () => this.amenities.set([]),
    });
    this.addressService.getProvinces().subscribe({
      next: (values) => this.provinces.set(values),
      error: () => this.provinces.set([]),
    });
  }

  toggleAmenity(name: string, checked: boolean): void {
    this.selectedAmenityNames.update((names) =>
      checked ? [...new Set([...names, name])] : names.filter((value) => value !== name),
    );
  }

  onProvinceChange(provinceId: string): void {
    this.provinceId.set(provinceId);
    this.wardId.set('');
    this.wards.set([]);
    if (provinceId) {
      this.addressService.getWards(provinceId, undefined, 0, 100).subscribe({
        next: (result) => this.wards.set(result.items),
        error: () => this.wards.set([]),
      });
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.emitSearch();
  }

  resetFilters(): void {
    this.location.set('');
    this.provinceId.set('');
    this.wardId.set('');
    this.wards.set([]);
    this.priceRange.set('all');
    this.roomTypeName.set('');
    this.selectedAmenityNames.set([]);
    this.rentalStatus.set(RoomRentalStatus.AVAILABLE);
    this.emitSearch();
  }

  private emitSearch(): void {
    this.locationLabels.emit({
      province: this.provinces().find((province) => province.id === this.provinceId())?.name ?? '',
      ward: this.wards().find((ward) => ward.id === this.wardId())?.name ?? '',
    });
    const [minPrice, maxPrice] = this.priceBounds();
    const provinceId = this.provinceId() || this.findProvinceByName(this.location());
    this.search.emit({
      page: 0,
      size: 12,
      provinceId: provinceId || undefined,
      roomTypeName: this.roomTypeName() || undefined,
      wardId: this.wardId() || undefined,
      rentalStatus: this.rentalStatus(),
      minPrice: minPrice ?? undefined,
      maxPrice: maxPrice ?? undefined,
      amenityNames: this.selectedAmenityNames(),
    });
  }

  private priceBounds(): [number | null, number | null] {
    switch (this.priceRange()) {
      case 'under3':
        return [null, 3000000];
      case '3to5':
        return [3000000, 5000000];
      case 'over5':
        return [5000000, null];
      default:
        return [null, null];
    }
  }

  private priceRangeFor(minPrice?: number, maxPrice?: number): string {
    if (minPrice == null && maxPrice == null) return 'all';
    if (minPrice == null && maxPrice === 3000000) return 'under3';
    if (minPrice === 3000000 && maxPrice === 5000000) return '3to5';
    if (minPrice === 5000000 && maxPrice == null) return 'over5';
    return 'all';
  }

  private findProvinceByName(query: string): string {
    const normalized = query.trim().toLocaleLowerCase('vi');
    return normalized
      ? this.provinces().find((p) => p.name.toLocaleLowerCase('vi').includes(normalized))?.id || ''
      : '';
  }
}
