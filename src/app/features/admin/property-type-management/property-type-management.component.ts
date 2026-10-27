import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PropertyTypeService } from '@services/property-type.service';
import { PropertyType, PropertyTypeList } from '@model/property-type/property-type.model';

@Component({
  selector: 'app-property-type-management',
  imports: [ReactiveFormsModule],
  templateUrl: './property-type-management.component.html',
  styleUrl: './property-type-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyTypeManagementComponent implements OnInit {
  private readonly service = inject(PropertyTypeService);
  private readonly destroyRef = inject(DestroyRef);
  readonly result = signal<PropertyTypeList | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly success = signal('');
  readonly editing = signal<PropertyType | null>(null);
  readonly deleting = signal<PropertyType | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    description: [''],
  });
  ngOnInit(): void {
    this.load(0);
  }
  load(page = this.result()?.page ?? 0): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .getPage(page)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => this.result.set(result),
        error: (err) => this.error.set(err.error?.message || 'Không tải được loại cơ sở.'),
      });
  }
  edit(type: PropertyType): void {
    if (this.busy()) return;
    this.editing.set(type);
    this.deleting.set(null);
    this.actionError.set('');
    this.form.reset({ name: type.name, description: type.description });
  }
  reset(): void {
    this.editing.set(null);
    this.deleting.set(null);
    this.actionError.set('');
    this.form.reset({ name: '', description: '' });
  }
  save(): void {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const values = this.form.getRawValue();
    const request = { name: values.name.trim(), description: values.description.trim() };
    const editing = this.editing();
    this.busy.set(true);
    this.actionError.set('');
    (editing ? this.service.update(editing.id, request) : this.service.create(request))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.success.set('Đã lưu loại cơ sở.');
          this.reset();
          this.load(editing ? (this.result()?.page ?? 0) : 0);
        },
        error: (err) => this.actionError.set(err.error?.message || 'Không lưu được loại cơ sở.'),
      });
  }
  remove(): void {
    const type = this.deleting();
    if (!type || this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');
    this.service
      .delete(type.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          this.success.set('Đã xóa loại cơ sở.');
          this.deleting.set(null);
          const page = this.result()?.page ?? 0;
          this.load(this.result()?.items.length === 1 && page > 0 ? page - 1 : page);
        },
        error: (err) =>
          this.actionError.set(
            err.error?.message || 'Không xóa được loại cơ sở. Loại đang sử dụng cần được giữ lại.',
          ),
      });
  }
}
