import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { RoomTypeService } from '@services/room-type.service';
import { RoomType } from '@model/room-type/room-type.model';

import { RoomTypeUtils } from '@shared/utils/room-type-utils';

export interface RoomTypeActionData {
  roomType?: RoomType;
  parentId?: string;
  existingTypes: RoomType[];
  action: 'create' | 'edit' | 'delete';
}

@Component({
  selector: 'app-room-type-action-dialog',
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './room-type-action-dialog.component.html',
  styleUrl: './room-type-action-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomTypeActionDialogComponent {
  readonly data = inject<RoomTypeActionData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RoomTypeActionDialogComponent, boolean>);
  private readonly roomTypeService = inject(RoomTypeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly busy = signal(false);
  readonly error = signal('');

  readonly parentOptions = RoomTypeUtils.options(
    RoomTypeUtils.parentChoices(this.data.existingTypes || [], this.data.roomType?.id),
  );

  readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data.roomType?.name ?? '', [Validators.required, Validators.maxLength(100)]],
    description: [this.data.roomType?.description ?? ''],
    parentId: [this.data.roomType?.parentId ?? this.data.parentId ?? ''],
  });

  submit(): void {
    if (this.busy()) return;
    if (this.data.action !== 'delete' && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;

    const values = this.form.getRawValue();
    let req: Observable<unknown>;

    if (this.data.action === 'delete') {
      req = this.roomTypeService.deleteRoomType(this.data.roomType!.id);
    } else if (this.data.action === 'edit') {
      req = this.roomTypeService.updateRoomType(this.data.roomType!.id, {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        parentId: values.parentId || null,
      });
    } else {
      req = this.roomTypeService.createRoomType({
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        parentId: values.parentId || null,
      });
    }

    req
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.busy.set(false);
          this.ref.disableClose = false;
        }),
      )
      .subscribe({
        next: () => this.ref.close(true),
        error: (err: { status?: number; error?: { message?: string } }) => {
          this.error.set(
            err.error?.message ||
              (err.status === 403
                ? 'Bạn không có quyền thực hiện thao tác này.'
                : 'Không thực hiện được yêu cầu. Vui lòng thử lại.'),
          );
        },
      });
  }
}
