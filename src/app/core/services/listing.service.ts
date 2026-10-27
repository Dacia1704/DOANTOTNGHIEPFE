import { Injectable, inject } from '@angular/core';
import { BillingApiService } from './billing-api.service';
import { Listing } from '@model/billing/billing.model';
import { SaveListingRequest } from '@model/billing/request/billing-request';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly api = inject(BillingApiService);
  mine(page = 0) {
    return this.api.page<Listing>('listings/mine', page);
  }
  allMine() {
    return this.api.all<Listing>('listings/mine');
  }
  admin(page = 0, status?: string) {
    return this.api.page<Listing>('listings/admin', page, undefined, status ? { status } : {});
  }
  pending(page = 0) {
    return this.api.page<Listing>('listings/pending', page);
  }
  create(body: SaveListingRequest) {
    return this.api.send<Listing>('POST', 'listings', body);
  }
  update(id: string, body: Pick<SaveListingRequest, 'title' | 'description'>) {
    return this.api.send<Listing>('PUT', `listings/${encodeURIComponent(id)}`, body);
  }
  action(id: string, action: 'hide' | 'submit' | 'approve' | 'reject', reason?: string) {
    return this.api.send<Listing>(
      'POST',
      `listings/${encodeURIComponent(id)}/${action}`,
      reason ? { reason } : null,
    );
  }
  priority(id: string, level: number) {
    return this.api.send<Listing>('PUT', `listings/${encodeURIComponent(id)}/priority`, { level });
  }
}
