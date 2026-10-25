import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ServicePackageService } from '@services/service-package.service';
import { BoostService } from '@services/boost.service';
import { BoostPackage, ServicePackage } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';

const integer: ValidatorFn = (control: AbstractControl) =>
  Number.isInteger(control.value) ? null : { integer: true };
const money: ValidatorFn = (control: AbstractControl) =>
  /^\d+(\.\d{1,2})?$/.test(String(control.value)) ? null : { money: true };
export interface CatalogEditorData {
  kind: 'service' | 'boost';
  item?: ServicePackage | BoostPackage;
}
@Component({
  selector: 'app-catalog-editor',
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './catalog-editor.component.html',
  styleUrl: './catalog-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogEditorComponent {
  private readonly packages = inject(ServicePackageService);
  private readonly boosts = inject(BoostService);
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<CatalogEditorComponent>);
  private readonly destroy = inject(DestroyRef);
  readonly data = inject<CatalogEditorData>(MAT_DIALOG_DATA);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly free = this.data.item?.code === 'FREE';
  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]{1,50}$/)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    unlimited: [false],
    maxListings: [3, [Validators.required, Validators.min(0), integer]],
    highPrioritySlots: [0, [Validators.required, Validators.min(0), integer]],
    lowPrioritySlots: [0, [Validators.required, Validators.min(0), integer]],
    defaultPriorityLevel: [0],
    hasStats: [false],
    active: [true],
    durationMonths: [1],
    price: [0],
  });
  constructor() {
    if (this.data.kind === 'boost') {
      this.form.controls.maxListings.clearValidators();
      this.form.controls.durationMonths.setValidators([
        Validators.required,
        (control) => ([1, 3, 6].includes(control.value) ? null : { duration: true }),
      ]);
      this.form.controls.price.setValidators([
        Validators.required,
        Validators.min(0),
        Validators.max(9999999999.99),
        money,
      ]);
    }
    if (this.data.item) {
      this.form.patchValue(this.data.item);
      if (this.data.kind === 'service')
        this.form.controls.unlimited.setValue(
          (this.data.item as ServicePackage).maxListings === null,
        );
    }
    this.form.controls.unlimited.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((value) => {
        if (value) this.form.controls.maxListings.disable();
        else if (!this.free) this.form.controls.maxListings.enable();
      });
    if (this.form.controls.unlimited.value) this.form.controls.maxListings.disable();
    if (this.free) {
      this.form.disable();
      this.form.controls.name.enable();
    }
    this.form.updateValueAndValidity();
  }
  save(): void {
    if (this.busy()) return;
    const value = this.form.getRawValue();
    this.error.set('');
    if (!value.name?.trim()) this.form.controls.name.setErrors({ required: true });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(
        'Kiểm tra các trường bắt buộc, số suất nguyên không âm và giá tối đa 2 chữ số thập phân.',
      );
      return;
    }
    if (this.data.kind === 'boost' && value.highPrioritySlots! + value.lowPrioritySlots! <= 0) {
      this.error.set('Gói Boost cần ít nhất một suất cao hoặc thấp.');
      return;
    }
    if (
      this.data.kind === 'service' &&
      !value.unlimited &&
      value.highPrioritySlots! + value.lowPrioritySlots! > value.maxListings!
    ) {
      this.error.set('Tổng suất cao/thấp không được vượt giới hạn tin.');
      return;
    }
    if (
      this.data.kind === 'service' &&
      value.defaultPriorityLevel === 1 &&
      value.lowPrioritySlots !== 0
    ) {
      this.error.set('Gói mặc định ưu tiên thấp phải có số suất thấp bằng 0.');
      return;
    }
    this.busy.set(true);
    this.ref.disableClose = true;
    const common = {
      code: value.code!.trim().toUpperCase(),
      name: value.name!.trim(),
      highPrioritySlots: value.highPrioritySlots!,
      lowPrioritySlots: value.lowPrioritySlots!,
      active: value.active!,
    };
    const request: Observable<BoostPackage | ServicePackage> =
      this.data.kind === 'boost'
        ? this.boosts.save(
            { ...common, durationMonths: value.durationMonths!, price: value.price! },
            this.data.item?.id,
          )
        : this.packages.save(
            this.free
              ? {
                  code: 'FREE',
                  name: value.name!.trim(),
                  maxListings: 3,
                  highPrioritySlots: 0,
                  lowPrioritySlots: 0,
                  defaultPriorityLevel: 0,
                  hasStats: false,
                  active: true,
                }
              : {
                  ...common,
                  maxListings: value.unlimited ? null : value.maxListings!,
                  defaultPriorityLevel: value.defaultPriorityLevel!,
                  hasStats: value.hasStats!,
                },
            this.data.item?.id,
          );
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
