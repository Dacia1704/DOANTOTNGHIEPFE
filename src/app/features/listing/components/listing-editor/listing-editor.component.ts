import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, expand, reduce } from 'rxjs';
import { RoomService } from '@services/room.service';
import { ListingService } from '@services/listing.service';
import { Room } from '@model/room/room.model';
import { Listing } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';

@Component({
  selector: 'app-listing-editor',
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './listing-editor.component.html',
  styleUrl: './listing-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingEditorComponent {
  private readonly api = inject(ListingService);
  private readonly roomsApi = inject(RoomService);
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<ListingEditorComponent>);
  private readonly destroy = inject(DestroyRef);
  readonly data = inject<{ listing?: Listing; reject?: boolean }>(MAT_DIALOG_DATA);
  readonly rooms = signal<Room[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    roomId: ['', Validators.required],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', Validators.maxLength(20000)],
    reason: [''],
  });
  constructor() {
    if (this.data.reject) {
      this.form.controls.roomId.clearValidators();
      this.form.controls.title.clearValidators();
      this.form.controls.reason.setValidators([Validators.required, Validators.maxLength(2000)]);
    } else if (this.data.listing) {
      this.form.patchValue(this.data.listing);
      this.form.controls.roomId.clearValidators();
    } else this.loadRooms();
    Object.values(this.form.controls).forEach((control) =>
      control.updateValueAndValidity({ emitEvent: false }),
    );
    this.form.updateValueAndValidity();
  }
  loadRooms(): void {
    this.loading.set(true);
    this.error.set('');
    this.roomsApi
      .getMyRooms(0, 100)
      .pipe(
        expand((page) =>
          page.page + 1 < page.totalPages ? this.roomsApi.getMyRooms(page.page + 1, 100) : EMPTY,
        ),
        reduce((rooms, page) => [...rooms, ...page.items], [] as Room[]),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (rooms) => {
          this.rooms.set(rooms.filter((room) => room.rentalStatus === 'AVAILABLE'));
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.loading.set(false);
        },
      });
  }
  save(): void {
    if (this.busy() || this.loading()) return;
    const value = this.form.getRawValue();
    if (!this.data.reject && !value.title.trim())
      this.form.controls.title.setErrors({ required: true });
    if (this.data.reject && !value.reason.trim())
      this.form.controls.reason.setErrors({ required: true });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    const request = this.data.reject
      ? this.api.action(this.data.listing!.id, 'reject', value.reason.trim())
      : this.data.listing
        ? this.api.update(this.data.listing.id, {
            title: value.title.trim(),
            description: value.description,
          })
        : this.api.create({
            roomId: value.roomId,
            title: value.title.trim(),
            description: value.description,
          });
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => this.ref.close(true),
      error: (error) => {
        this.error.set(BillingUtils.error(error));
        this.busy.set(false);
        this.ref.disableClose = false;
      },
    });
  }
}
