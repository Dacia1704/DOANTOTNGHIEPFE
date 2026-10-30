import { Injectable, inject } from '@angular/core';
import { BillingApiService } from './billing-api.service';
import {
  ActiveBoost,
  BoostAllocation,
  BoostPackage,
  BoostSubscription,
} from '@model/billing/billing.model';
import {
  AllocateBoostRequest,
  CreateBoostRequest,
  SaveBoostPackageRequest,
} from '@model/billing/request/billing-request';

@Injectable({ providedIn: 'root' })
export class BoostService {
  private readonly api = inject(BillingApiService);
  packages() {
    return this.api.all<BoostPackage>('boost-packages');
  }
  catalog(page = 0) {
    return this.api.page<BoostPackage>('boost-packages', page, true);
  }
  list(page = 0) {
    return this.api.page<BoostSubscription>('boost-subscriptions', page);
  }
  all() {
    return this.api.all<BoostSubscription>('boost-subscriptions');
  }
  active() {
    return this.api.get<ActiveBoost[]>('boost-subscriptions/active');
  }
  allocate(listingId: string, body: AllocateBoostRequest) {
    return this.api.send<BoostAllocation>(
      'PUT',
      `boost-subscriptions/allocations/${encodeURIComponent(listingId)}`,
      body,
    );
  }
  release(listingId: string) {
    return this.api.send<null>(
      'DELETE',
      `boost-subscriptions/allocations/${encodeURIComponent(listingId)}`,
    );
  }
  create(body: CreateBoostRequest) {
    return this.api.send<BoostSubscription>('POST', 'boost-subscriptions', body);
  }
  save(body: SaveBoostPackageRequest, id?: string) {
    return this.api.send<BoostPackage>(
      id ? 'PUT' : 'POST',
      `boost-packages${id ? '/' + encodeURIComponent(id) : ''}`,
      body,
    );
  }
  status(id: string, active: boolean) {
    return this.api.send<BoostPackage>('PATCH', `boost-packages/${encodeURIComponent(id)}/status`, {
      active,
    });
  }
}
