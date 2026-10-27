import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { OverlayModule, ConnectedPosition } from '@angular/cdk/overlay';
import { A11yModule } from '@angular/cdk/a11y';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RoomTypeUtils } from '@shared/utils/room-type-utils';
import { RoomTypeService } from '@core/services/room-type.service';
import { RoomTypeTreeComponent } from '@shared/components/room-type-tree/room-type-tree.component';
import { RoomType } from '@model/room-type/room-type.model';

@Component({
  selector: 'app-category-bar',
  imports: [RoomTypeTreeComponent, OverlayModule, A11yModule, FormsModule],
  templateUrl: './category-bar.component.html',
  styleUrl: './category-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBarComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly roomTypeService = inject(RoomTypeService);
  @Output() readonly typeSelected = new EventEmitter<string>();
  readonly roomTypes = signal<RoomType[]>([]);
  readonly selectedName = signal('');
  readonly expanded = signal(false);
  readonly query = signal('');
  readonly quickTypes = computed(() =>
    RoomTypeUtils.tree(this.roomTypes())
      .slice(0, 4)
      .map((node) => node.type),
  );
  readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  ];
  readonly loading = signal(true);
  readonly error = signal('');
  @Input() set selectedRoomType(value: string) {
    this.selectedName.set(value ?? '');
  }

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set('');
    this.roomTypeService
      .getAllRoomTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          this.roomTypes.set(types);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Không tải được loại phòng.');
        },
      });
  }

  closePicker(): void {
    this.expanded.set(false);
    this.query.set('');
  }

  onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closePicker();
    }
  }

  select(name: string): void {
    this.closePicker();
    this.selectedName.set(name);
    this.typeSelected.emit(name);
  }
}
