import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PropertyService } from '@services/property/property.service';
import { ListingService } from '@services/listing/listing.service';
import { BoostService } from '@services/subscription/boost.service';
import { SubscriptionService } from '@services/subscription/subscription.service';
import { Property } from '@model/property/property.model';
import { ActiveBoost, CurrentSubscription, Listing } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';

@Component({
  selector: 'app-listing-editor',
  imports: [ReactiveFormsModule, MatDialogModule, RouterLink],
  templateUrl: './listing-editor.component.html',
  styleUrl: './listing-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingEditorComponent {
  private readonly api = inject(ListingService);
  private readonly propertiesApi = inject(PropertyService);
  private readonly boostsApi = inject(BoostService);
  private readonly subscriptionsApi = inject(SubscriptionService);
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(MatDialogRef<ListingEditorComponent>);
  private readonly destroy = inject(DestroyRef);
  readonly data = inject<{ listing?: Listing; reject?: boolean }>(MAT_DIALOG_DATA);
  readonly properties = signal<Property[]>([]);
  readonly boosts = signal<ActiveBoost[]>([]);
  readonly current = signal<CurrentSubscription | null>(null);
  readonly ui = BillingUtils;
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    propertyId: ['', Validators.required],
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', Validators.maxLength(20000)],
    reason: [''],
    priorityLevel: [0],
    prioritySource: ['package'],
    boostSubscriptionId: [''],
    boostPriorityLevel: [2],
  });
  constructor() {
    if (this.data.reject) {
      this.form.controls.propertyId.clearValidators();
      this.form.controls.title.clearValidators();
      this.form.controls.reason.setValidators([Validators.required, Validators.maxLength(2000)]);
    } else if (this.data.listing) {
      this.form.patchValue(this.data.listing);
      this.form.controls.propertyId.clearValidators();
    } else this.loadProperties();
    Object.values(this.form.controls).forEach((control) =>
      control.updateValueAndValidity({ emitEvent: false }),
    );
    this.form.updateValueAndValidity();
  }
  loadProperties(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      properties: this.propertiesApi.getAllMine(),
      current: this.subscriptionsApi.current(),
      boosts: this.boostsApi.active(),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ properties, current, boosts }) => {
          this.properties.set(properties.filter((property) => property.availableCount > 0));
          this.current.set(current);
          this.boosts.set(boosts);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.loading.set(false);
        },
      });
  }
  selectedBoost(): ActiveBoost | undefined {
    return this.boosts().find(
      (boost) => boost.subscription.id === this.form.controls.boostSubscriptionId.value,
    );
  }
  boostRemaining(level: number): number {
    const boost = this.selectedBoost();
    return (
      (level === 2 ? boost?.remainingHighPrioritySlots : boost?.remainingLowPrioritySlots) ?? 0
    );
  }
  selectBoost(): void {
    const level = this.boostRemaining(2) > 0 ? 2 : 1;
    this.form.controls.boostPriorityLevel.setValue(level);
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
    if (!this.data.listing && !this.data.reject) {
      if (!this.current()?.canSubmitListings) {
        this.error.set('Gói dịch vụ chưa cho phép đăng tin. Vui lòng kiểm tra gói của bạn.');
        return;
      }
      if (
        value.prioritySource === 'boost' &&
        (!this.selectedBoost() ||
          !BillingUtils.future(this.selectedBoost()!.subscription.endAt) ||
          this.boostRemaining(value.boostPriorityLevel) <= 0)
      ) {
        this.error.set('Chọn gói Boost còn hiệu lực và còn lượt ở mức ưu tiên mong muốn.');
        return;
      }
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
            propertyId: value.propertyId,
            title: value.title.trim(),
            description: value.description,
            priorityLevel: value.prioritySource === 'boost' ? 0 : Number(value.priorityLevel),
            ...(value.prioritySource === 'boost'
              ? {
                  boostSubscriptionId: value.boostSubscriptionId,
                  boostPriorityLevel: value.boostPriorityLevel as 1 | 2,
                }
              : {}),
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
