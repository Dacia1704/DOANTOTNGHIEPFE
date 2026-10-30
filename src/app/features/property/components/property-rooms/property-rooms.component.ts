import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Property } from '@model/property/property.model';
import { Room, RoomRentalStatus, ROOM_STATUS_LABELS } from '@model/room/room.model';
import { RoomUtils } from '@shared/utils/room-utils';

@Component({
  selector: 'app-property-rooms',
  imports: [FormsModule],
  templateUrl: './property-rooms.component.html',
  styleUrl: './property-rooms.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyRoomsComponent {
  readonly property = input.required<Property>();
  readonly readOnly = input(false);
  readonly addRoom = output<void>();
  readonly viewRoom = output<Room>();
  readonly editRoom = output<Room>();
  readonly manageImages = output<Room>();
  readonly deleteRoom = output<Room>();
  readonly search = signal('');
  readonly status = signal('');
  readonly statuses = Object.values(RoomRentalStatus);
  readonly labels = ROOM_STATUS_LABELS;
  readonly utils = RoomUtils;
  constructor() {
    effect(() => {
      this.property();
      this.search.set('');
      this.status.set('');
    });
  }
  readonly filtered = computed(() => {
    const search = this.search().trim().toLocaleLowerCase('vi');
    return this.property().rooms.filter(
      (room) =>
        (!this.status() || room.rentalStatus === this.status()) &&
        (!search ||
          `${room.displayName} ${room.roomTypeName}`.toLocaleLowerCase('vi').includes(search)),
    );
  });
  readonly groups = computed(() => {
    const groups = new Map<number | null, Room[]>();
    for (const room of this.filtered())
      groups.set(room.floorNumber, [...(groups.get(room.floorNumber) ?? []), room]);
    return [...groups.entries()]
      .sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
      .map(([floor, rooms]) => ({
        floor,
        label:
          this.property().rentalMode === 'WHOLE'
            ? 'Đơn vị cho thuê nguyên căn'
            : floor === null
              ? 'Chưa ghi nhận tầng'
              : floor === 0
                ? 'Tầng trệt'
                : `Tầng ${floor}`,
        rooms: [...rooms].sort((a, b) =>
          a.roomNumber.localeCompare(b.roomNumber, 'vi', { numeric: true }),
        ),
      }));
  });
}
