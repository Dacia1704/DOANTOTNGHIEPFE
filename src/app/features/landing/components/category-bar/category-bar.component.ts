import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { RoomTypeService } from '@core/services/room-type.service';
import { RoomType } from '@model/room-type/room-type.model';

@Component({
  selector: 'app-category-bar',
  imports: [],
  templateUrl: './category-bar.component.html',
  styleUrl: './category-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBarComponent implements OnInit {
  private readonly roomTypeService = inject(RoomTypeService);
  @Output() readonly typeSelected = new EventEmitter<string>();
  readonly roomTypes = signal<RoomType[]>([]);
  readonly selectedName = signal('');
  @Input() set selectedRoomType(value: string) { this.selectedName.set(value ?? ''); }

  ngOnInit(): void {
    this.roomTypeService.getAllRoomTypes().subscribe({
      next: types => this.roomTypes.set(types),
      error: () => this.roomTypes.set([]),
    });
  }

  select(name: string): void {
    this.selectedName.set(name);
    this.typeSelected.emit(name);
  }
}
