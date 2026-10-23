import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RoomService } from '@services/room.service';
import { Room, RoomImage } from '@model/room/room.model';
import { ImageUtils } from '@shared/utils/image-utils';

export interface RoomImageDialogData {
  room: Room;
}

@Component({
  selector: 'app-room-image-dialog',
  imports: [MatDialogModule],
  templateUrl: './room-image-dialog.component.html',
  styleUrl: './room-image-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomImageDialogComponent {
  readonly data = inject<RoomImageDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RoomImageDialogComponent, boolean>);
  private readonly roomService = inject(RoomService);
  private readonly destroyRef = inject(DestroyRef);

  readonly imageUtils = ImageUtils;

  readonly images = signal<RoomImage[]>([...(this.data.room.images || [])]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  private changed = false;

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    this.busy.set(true);
    this.error.set('');
    this.success.set('');

    this.roomService.uploadImages(this.data.room.id, files).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.busy.set(false);
        input.value = '';
      }),
    ).subscribe({
      next: newImages => {
        this.changed = true;
        this.images.update(current => [...current, ...newImages]);
        this.success.set(`Đã tải lên thành công ${newImages.length} ảnh.`);
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.error.set(
          err.error?.message ||
            'Không tải được ảnh lên. Vui lòng kiểm tra định dạng và kích thước ảnh.',
        );
      },
    });
  }

  deleteImage(image: RoomImage): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');

    this.roomService.deleteImage(this.data.room.id, image.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busy.set(false)),
    ).subscribe({
      next: () => {
        this.changed = true;
        this.images.update(current => current.filter(img => img.id !== image.id));
        this.success.set('Đã xóa ảnh.');
      },
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.error.set(err.error?.message || 'Không thể xóa ảnh. Vui lòng thử lại.');
      },
    });
  }

  close(): void {
    this.ref.close(this.changed);
  }
}
