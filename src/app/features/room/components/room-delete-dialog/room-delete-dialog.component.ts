import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RoomService } from '@services/room.service';
import { Room } from '@model/room/room.model';

export interface RoomDeleteDialogData {
  room: Room;
}

@Component({
  selector: 'app-room-delete-dialog',
  imports: [MatDialogModule],
  templateUrl: './room-delete-dialog.component.html',
  styleUrl: './room-delete-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomDeleteDialogComponent {
  readonly data = inject<RoomDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RoomDeleteDialogComponent, boolean>);
  private readonly roomService = inject(RoomService);
  private readonly destroyRef = inject(DestroyRef);

  readonly busy = signal(false);
  readonly error = signal('');

  confirmDelete(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;

    this.roomService.deleteRoom(this.data.room.id).pipe(
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
              ? 'Bạn không có quyền xóa phòng này.'
              : 'Không thể xóa phòng. Vui lòng thử lại sau.'),
        );
      },
    });
  }
}
