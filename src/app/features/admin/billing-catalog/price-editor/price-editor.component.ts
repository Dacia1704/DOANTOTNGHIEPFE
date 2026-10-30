import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ServicePackageService } from '@services/service-package.service';
import { PriceOption, ServicePackage } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';

@Component({
  selector: 'app-price-editor',
  imports: [CurrencyPipe, ReactiveFormsModule, MatDialogModule],
  templateUrl: './price-editor.component.html',
  styleUrl: './price-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceEditorComponent {
  private readonly api = inject(ServicePackageService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);
  readonly ref = inject(MatDialogRef<PriceEditorComponent>);
  readonly data = inject<ServicePackage>(MAT_DIALOG_DATA);
  readonly prices = signal<PriceOption[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly editing = signal<PriceOption | null>(null);
  readonly form = this.fb.nonNullable.group({
    durationMonths: [1, Validators.required],
    price: [0, [Validators.required, Validators.min(0), Validators.max(9999999999.99)]],
    active: [true],
  });
  constructor() {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .prices(this.data.id, true)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (prices) => {
          this.prices.set(prices);
          if (!this.editing()) this.reset();
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.loading.set(false);
        },
      });
  }
  select(price: PriceOption): void {
    this.editing.set(price);
    this.form.patchValue(price);
    this.form.controls.durationMonths.disable();
  }
  durationExists(month: number): boolean {
    return this.prices().some((price) => price.durationMonths === month);
  }
  reset(): void {
    this.editing.set(null);
    this.form.reset({
      durationMonths:
        [1, 3, 6, 12].find((m) => !this.prices().some((p) => p.durationMonths === m)) ?? 1,
      price: 0,
      active: true,
    });
    this.form.controls.durationMonths.enable();
  }
  save(): void {
    if (this.busy() || this.loading()) return;
    const value = this.form.getRawValue();
    if (!this.editing() && this.durationExists(value.durationMonths)) {
      this.error.set('Thời hạn này đã có giá. Chọn sửa hoặc bật bán lại mức giá hiện có.');
      return;
    }
    if (this.form.invalid || !/^\d+(\.\d{1,2})?$/.test(String(value.price))) {
      this.form.markAllAsTouched();
      this.error.set('Giá phải không âm, tối đa 10 chữ số nguyên và 2 chữ số thập phân.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    this.api
      .savePrice(this.data.id, value, this.editing()?.id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.ref.disableClose = false;
          this.success.set('Đã lưu mức giá. Các đơn đã tạo giữ nguyên giá cũ.');
          this.editing.set(null);
          this.load();
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.busy.set(false);
          this.ref.disableClose = false;
        },
      });
  }
}
