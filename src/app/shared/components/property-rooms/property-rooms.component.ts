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
import {
  ManagementTableComponent,
  ManagementTableColumn,
} from '../management-table/management-table.component';
import { ManagementTableCellDirective } from '../management-table/management-table-cell.directive';

@Component({
  selector: 'app-property-rooms',
  imports: [FormsModule, ManagementTableComponent, ManagementTableCellDirective],
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
  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly statuses = ['AVAILABLE', 'HELD', 'RENTED', 'MAINTENANCE'];
  readonly labels: Record<string, string> = { ...ROOM_STATUS_LABELS, HELD: 'Đang giữ chỗ' };
  readonly utils = RoomUtils;
  readonly roomKey = (room: Room) => room.id;
  readonly roomColumns: readonly ManagementTableColumn<Room>[] = [
    { key: 'name', label: 'Phòng / căn' },
    {
      key: 'floor',
      label: 'Tầng',
      value: (room) =>
        room.floorNumber === null
          ? 'Chưa ghi nhận tầng'
          : room.floorNumber === 0
            ? 'Tầng trệt'
            : `Tầng ${room.floorNumber}`,
    },
    { key: 'price', label: 'Giá thuê / tháng' },
    { key: 'capacity', label: 'Diện tích & sức chứa' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Thao tác', align: 'right' },
  ];
  constructor() {
    effect(() => {
      this.property();
      this.search.set('');
      this.status.set('');
    });
    effect(() => {
      this.property();
      this.search();
      this.status();
      this.pageSize();
      this.page.set(0);
    });
  }
  readonly filtered = computed(() => {
    const search = this.search().trim().toLocaleLowerCase('vi');
    return this.property().rooms.filter(
      (room) =>
        (!this.status() || room.bookingAvailability === this.status()) &&
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
  readonly sortedRooms = computed(() => this.groups().flatMap((group) => group.rooms));
  readonly pagination = computed(() => ({
    page: this.page(),
    total: this.sortedRooms().length,
    totalPages: Math.ceil(this.sortedRooms().length / this.pageSize()),
  }));
  readonly pagedRooms = computed(() =>
    this.sortedRooms().slice(this.page() * this.pageSize(), (this.page() + 1) * this.pageSize()),
  );
}
