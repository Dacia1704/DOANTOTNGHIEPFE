import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { BoostService } from '@services/boost.service';
import { ListingService } from '@services/listing.service';
import { ActiveBoost, BoostAllocation, Listing } from '@model/billing/billing.model';
import { BillingUtils } from '@shared/utils/billing-utils';

export interface AllocationDialogData {
  listingId?: string;
  boostSubscriptionId?: string;
}
@Component({
  selector: 'app-boost-allocation-dialog',
  imports: [MatDialogModule, ReactiveFormsModule],
  templateUrl: './boost-allocation-dialog.component.html',
  styleUrl: './boost-allocation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoostAllocationDialogComponent {
  private readonly api = inject(BoostService);
  private readonly listingsApi = inject(ListingService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);
  private readonly ref = inject(MatDialogRef<BoostAllocationDialogComponent>);
  readonly data = inject<AllocationDialogData>(MAT_DIALOG_DATA);
  readonly ui = BillingUtils;
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly groups = signal<ActiveBoost[]>([]);
  readonly listings = signal<Listing[]>([]);
  readonly selectedListingId = signal('');
  readonly selectedGroupId = signal('');
  readonly form = this.fb.nonNullable.group({
    listingId: ['', Validators.required],
    boostSubscriptionId: ['', Validators.required],
    level: [2, Validators.required],
  });
  readonly allocations = computed(() => this.groups().flatMap((group) => group.allocations));
  readonly existing = computed(() =>
    this.allocations().find((item) => item.listingId === this.selectedListingId()),
  );
  readonly selectedListing = computed(() =>
    this.listings().find((item) => item.id === this.selectedListingId()),
  );
  readonly selectedGroup = computed(() =>
    this.groups().find((item) => item.subscription.id === this.selectedGroupId()),
  );
  readonly eligibleListings = computed(() =>
    this.listings().filter((item) => BillingUtils.published(item)),
  );
  constructor() {
    this.form.controls.listingId.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((id) => {
        this.selectedListingId.set(id);
        this.prefill(id);
      });
    this.form.controls.boostSubscriptionId.valueChanges
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((id) => this.selectedGroupId.set(id));
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ groups: this.api.active(), listings: this.listingsApi.allMine() })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (result) => {
          this.groups.set(result.groups);
          this.listings.set(result.listings);
          this.form.patchValue({ boostSubscriptionId: this.data.boostSubscriptionId ?? '' });
          this.form.patchValue({ listingId: this.data.listingId ?? '' });
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set(BillingUtils.error(error));
        },
      });
  }
  private prefill(listingId: string): void {
    const allocation = this.allocations().find((item) => item.listingId === listingId);
    if (allocation)
      this.form.patchValue({
        boostSubscriptionId: allocation.boostSubscriptionId,
        level: allocation.level,
      });
  }
  canUse(level: number): boolean {
    const group = this.selectedGroup();
    if (!group || !BillingUtils.future(group.subscription.endAt)) return false;
    const existing = this.existing();
    return (
      (level === 2 ? group.remainingHighPrioritySlots : group.remainingLowPrioritySlots) > 0 ||
      (existing?.boostSubscriptionId === group.subscription.id && existing.level === level)
    );
  }
  save(): void {
    const { listingId, boostSubscriptionId, level } = this.form.getRawValue();
    if (
      this.busy() ||
      this.form.invalid ||
      !this.canUse(level) ||
      !this.selectedListing() ||
      !BillingUtils.published(this.selectedListing()!)
    ) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    this.api
      .allocate(listingId, { boostSubscriptionId, level: level as 1 | 2 })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => this.ref.close(true),
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.busy.set(false);
          this.ref.disableClose = false;
        },
      });
  }
  release(): void {
    const existing = this.existing();
    if (!existing || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    this.api
      .release(existing.listingId)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => this.ref.close(true),
        error: (error) => {
          this.error.set(BillingUtils.error(error));
          this.busy.set(false);
          this.ref.disableClose = false;
        },
      });
  }
}
