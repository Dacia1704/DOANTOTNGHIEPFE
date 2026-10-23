import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { AdministrativeUnitService } from '@services/administrative-unit.service';
import { Province, Ward } from '@model/administrative-unit.model';

interface WardActionData {
  action: 'create' | 'edit' | 'delete';
  ward?: Ward;
  provinces: Province[];
  provinceId: string;
}

@Component({
  selector: 'app-ward-action-dialog',
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './ward-action-dialog.component.html',
  styleUrl: './ward-action-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WardActionDialogComponent {
  readonly data = inject<WardActionData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<WardActionDialogComponent, 'changed' | 'stale'>);
  private readonly service = inject(AdministrativeUnitService);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly detailReady = signal(this.data.action !== 'edit');
  readonly error = signal('');
  readonly stale = signal(false);
  readonly title = this.data.action === 'create' ? 'Thêm phường/xã' : this.data.action === 'edit' ? 'Chỉnh sửa phường/xã' : 'Xóa phường/xã';
  readonly form = inject(FormBuilder).nonNullable.group({
    code: [this.data.ward?.code ?? '', [Validators.required, Validators.pattern(/^[0-9]{5}$/)]],
    name: [this.data.ward?.name ?? '', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    provinceId: [this.data.ward?.provinceId ?? this.data.provinceId, [Validators.required, Validators.maxLength(36)]],
  });

  constructor() {
    if (this.data.action === 'edit') this.load();
  }

  load(): void {
    this.detailReady.set(false);
    this.loading.set(true);
    this.error.set('');
    this.service.get(this.data.ward!.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: ward => {
        this.form.patchValue({ code: ward.code, name: ward.name, provinceId: ward.provinceId });
        this.detailReady.set(true);
      },
      error: err => {
        this.stale.set(err.status === 404);
        this.ref.disableClose = this.stale();
        this.error.set(err.error?.message || 'Không tải được thông tin phường/xã. Vui lòng thử lại.');
      },
    });
  }

  close(): void { this.ref.close(this.stale() ? 'stale' : undefined); }

  submit(): void {
    if (this.busy() || this.loading() || this.stale() || !this.detailReady()) return;
    if (this.data.action !== 'delete' && this.form.invalid) { this.form.markAllAsTouched(); return; }
    const values = this.form.getRawValue();
    const body = { ...values, name: values.name.trim() };
    const request: Observable<unknown> = this.data.action === 'delete' ? this.service.delete(this.data.ward!.id)
      : this.data.action === 'edit' ? this.service.update(this.data.ward!.id, body) : this.service.create(body);
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      this.busy.set(false); this.ref.disableClose = this.stale();
    })).subscribe({
      next: () => this.ref.close('changed'),
      error: err => {
        if (err.status === 409 && this.data.action !== 'delete') {
          this.form.controls.code.setErrors({ duplicate: true });
          this.form.controls.code.markAsTouched();
        }
        if (err.status === 404) {
          // A missing province also returns 404; the user can close and refresh the list.
          this.stale.set(true);
        }
        this.error.set(err.status === 409 && this.data.action === 'delete'
          ? 'Không thể xóa vì phường/xã đang được sử dụng bởi phòng hoặc hồ sơ người thuê.'
          : err.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.'
          : err.error?.message || 'Không thực hiện được yêu cầu. Vui lòng thử lại.');
      },
    });
  }
}
