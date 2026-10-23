import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { AmenityService } from '@core/services/amenity.service';
import { Amenity } from '@model/amenity/amenity.model';
import { RoomQueryParams } from '@model/room/request/room-query-params';

type PricePreset = { id: string; label: string; minPrice?: number; maxPrice?: number };

@Component({
  selector: 'app-quick-filter-bar',
  imports: [],
  templateUrl: './quick-filter-bar.component.html',
  styleUrl: './quick-filter-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickFilterBarComponent implements OnInit {
  private readonly amenityService = inject(AmenityService);
  @Output() readonly filtersChanged = new EventEmitter<RoomQueryParams>();

  readonly presets: PricePreset[] = [
    { id: 'all', label: 'Mọi mức giá' },
    { id: 'under3', label: 'Dưới 3 triệu', maxPrice: 3000000 },
    { id: '3to5', label: '3–5 triệu', minPrice: 3000000, maxPrice: 5000000 },
    { id: 'over5', label: 'Trên 5 triệu', minPrice: 5000000 },
  ];
  readonly amenities = signal<Amenity[]>([]);
  readonly activePrice = signal('all');
  readonly selectedAmenities = signal<string[]>([]);
  readonly showAmenities = signal(false);
  @Input() set appliedFilters(query: RoomQueryParams) {
    this.selectedAmenities.set(query.amenityNames ?? []);
    const matchingPreset = this.presets.find(preset => preset.minPrice === query.minPrice && preset.maxPrice === query.maxPrice);
    this.activePrice.set(matchingPreset?.id ?? 'all');
  }

  ngOnInit(): void {
    this.amenityService.getAllAmenities().subscribe({
      next: amenities => this.amenities.set(amenities),
      error: () => this.amenities.set([]),
    });
  }

  setPrice(preset: PricePreset): void {
    this.activePrice.set(preset.id);
    this.emitFilters();
  }

  toggleAmenity(name: string, checked: boolean): void {
    this.selectedAmenities.update(current => checked
      ? [...new Set([...current, name])]
      : current.filter(value => value !== name));
    this.emitFilters();
  }

  private emitFilters(): void {
    const preset = this.presets.find(value => value.id === this.activePrice()) ?? this.presets[0];
    this.filtersChanged.emit({
      minPrice: preset.minPrice,
      maxPrice: preset.maxPrice,
      amenityNames: this.selectedAmenities(),
    });
  }
}
