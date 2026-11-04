import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, concatMap, defer, from, of, switchMap, tap, toArray } from 'rxjs';
import { ServicePackageService } from '@services/subscription/service-package.service';
import { BoostService } from '@services/subscription/boost.service';
import { BoostPackage, PriceOption, ServicePackage } from '@model/billing/billing.model';
import { SavePackageRequest, SavePriceRequest } from '@model/billing/request/billing-request';
import { BillingUtils } from '@shared/utils/billing-utils';

const integer: ValidatorFn = (control: AbstractControl) =>
  Number.isInteger(control.value) ? null : { integer: true };
const money: ValidatorFn = (control: AbstractControl) =>
  /^\d+(\.\d{1,2})?$/.test(String(control.value)) ? null : { money: true };
type PriceForm = FormGroup<{
  durationMonths: FormControl<number>;
  price: FormControl<number | null>;
}>;
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
  readonly servicePricing = this.data.kind === 'service' && !this.free;
  readonly durations = [1, 3, 6, 12];
  readonly loadingPrices = signal(false);
  readonly priceLoadFailed = signal(false);
  private savedPackage =
    this.data.kind === 'service' ? (this.data.item as ServicePackage | undefined) : undefined;
  private knownPrices: PriceOption[] = [];
  private changed = false;
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
    prices: this.fb.array<PriceForm>([]),
  });
  get priceRows() {
    return this.form.controls.prices;
  }
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
    if (this.servicePricing) {
      if (this.data.item) this.loadPrices();
      else this.addPrice();
    }
    this.form.updateValueAndValidity();
  }
  loadPrices(): void {
    if (!this.savedPackage || this.loadingPrices() || this.busy()) return;
    this.loadingPrices.set(true);
    this.priceLoadFailed.set(false);
    this.error.set('');
    this.packages
      .prices(this.savedPackage.id, true)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (prices) => {
          this.knownPrices = prices;
          this.priceRows.clear();
          for (const price of prices.filter((price) => price.active)) {
            this.addPrice(price.durationMonths, price.price);
          }
          if (!this.priceRows.length) this.addPrice();
          this.loadingPrices.set(false);
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.priceLoadFailed.set(true);
          this.loadingPrices.set(false);
        },
      });
  }
  durationUsed(months: number, except?: PriceForm): boolean {
    return this.priceRows.controls.some(
      (row) => row !== except && row.controls.durationMonths.value === months,
    );
  }
  addPrice(
    months = this.durations.find((month) => !this.durationUsed(month)),
    price?: number,
  ): void {
    if (months === undefined || this.durationUsed(months)) return;
    const previous = this.knownPrices.find((item) => item.durationMonths === months);
    this.priceRows.push(
      this.fb.group({
        durationMonths: this.fb.nonNullable.control(months, [
          Validators.required,
          (control) => (this.durations.includes(control.value) ? null : { duration: true }),
        ]),
        price: this.fb.control<number | null>(price ?? previous?.price ?? null, [
          Validators.required,
          Validators.min(0),
          Validators.max(9999999999.99),
          money,
        ]),
      }),
    );
  }
  removePrice(index: number): void {
    if (this.busy() || this.priceRows.length <= 1) return;
    this.priceRows.removeAt(index);
  }
  close(): void {
    this.ref.close(this.changed);
  }
  save(): void {
    if (this.busy() || this.loadingPrices() || this.priceLoadFailed()) return;
    const value = this.form.getRawValue();
    this.error.set('');
    if (!value.name?.trim()) this.form.controls.name.setErrors({ required: true });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(
        'Vui lòng điền đầy đủ thông tin. Số suất phải là số nguyên không âm; giá không âm và có tối đa 2 chữ số thập phân.',
      );
      return;
    }
    if (
      this.servicePricing &&
      (!value.prices.length ||
        new Set(value.prices.map((price) => price.durationMonths)).size !== value.prices.length)
    ) {
      this.error.set('Cần ít nhất một thời hạn có giá. Mỗi thời hạn chỉ được thêm một lần.');
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
        : this.saveService(
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
          );
    request.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => this.ref.close(true),
      error: (error) => {
        this.error.set(
          (this.changed
            ? 'Một phần thay đổi đã được lưu. Bấm Lưu gói để hoàn tất phần còn lại. '
            : '') + BillingUtils.error(error),
        );
        this.busy.set(false);
        this.ref.disableClose = false;
      },
    });
  }

  private saveService(body: SavePackageRequest): Observable<ServicePackage> {
    // New or stopped packages go on sale only after their prices have been saved.
    const active = body.active && (this.savedPackage?.active ?? false);
    return this.packages.save(this.free ? body : { ...body, active }, this.savedPackage?.id).pipe(
      tap((saved) => {
        this.savedPackage = saved;
        this.changed = true;
      }),
      switchMap((saved) =>
        this.free
          ? of(saved)
          : this.packages.prices(saved.id, true).pipe(
              tap((prices) => (this.knownPrices = prices)),
              switchMap(() => this.syncPrices(saved.id)),
              switchMap(() =>
                saved.active === body.active
                  ? of(saved)
                  : this.packages.status(saved.id, body.active),
              ),
            ),
      ),
      tap((saved) => (this.savedPackage = saved)),
    );
  }

  private syncPrices(packageId: string): Observable<PriceOption[]> {
    const selected: SavePriceRequest[] = this.priceRows.getRawValue().map((row) => ({
      durationMonths: row.durationMonths,
      price: row.price!,
      active: true,
    }));
    // The API retains historical prices. Removing a row withdraws that duration from new purchases.
    const removed: SavePriceRequest[] = this.knownPrices
      .filter(
        (price) =>
          price.active && !selected.some((row) => row.durationMonths === price.durationMonths),
      )
      .map((price) => ({
        durationMonths: price.durationMonths,
        price: price.price,
        active: false,
      }));
    return from([...selected, ...removed]).pipe(
      concatMap((body) =>
        defer(() => {
          const previous = this.knownPrices.find(
            (price) => price.durationMonths === body.durationMonths,
          );
          if (previous && previous.price === body.price && previous.active === body.active)
            return of(previous);
          return this.packages.savePrice(packageId, body, previous?.id).pipe(
            tap((saved) => {
              this.knownPrices = [
                ...this.knownPrices.filter((price) => price.id !== saved.id),
                saved,
              ];
            }),
          );
        }),
      ),
      toArray(),
    );
  }
}
