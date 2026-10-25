import { Injectable, inject } from '@angular/core';
import { BillingApiService } from './billing-api.service';
import { PriceOption, ServicePackage } from '@model/billing/billing.model';
import { SavePackageRequest, SavePriceRequest } from '@model/billing/request/billing-request';

@Injectable({ providedIn: 'root' })
export class ServicePackageService {
  private readonly api = inject(BillingApiService);
  all() {
    return this.api.all<ServicePackage>('service-packages');
  }
  list(page = 0) {
    return this.api.page<ServicePackage>('service-packages', page, true);
  }
  prices(id: string, admin = false) {
    return this.api.get<PriceOption[]>(
      `service-packages/${encodeURIComponent(id)}/prices?includeInactive=${admin}`,
    );
  }
  save(body: SavePackageRequest, id?: string) {
    return this.api.send<ServicePackage>(
      id ? 'PUT' : 'POST',
      `service-packages${id ? '/' + encodeURIComponent(id) : ''}`,
      body,
    );
  }
  savePrice(packageId: string, body: SavePriceRequest, id?: string) {
    return this.api.send<PriceOption>(
      id ? 'PUT' : 'POST',
      `service-packages/${encodeURIComponent(packageId)}/prices${id ? '/' + encodeURIComponent(id) : ''}`,
      body,
    );
  }
  status(id: string, active: boolean) {
    return this.api.send<ServicePackage>(
      'PATCH',
      `service-packages/${encodeURIComponent(id)}/status`,
      { active },
    );
  }
}
