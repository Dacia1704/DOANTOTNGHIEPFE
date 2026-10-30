import { Injectable, inject } from '@angular/core';
import { BillingApiService } from './billing-api.service';
import {
  CurrentSubscription,
  Subscription,
  SubscriptionOrder,
  SubscriptionPeriod,
} from '@model/billing/billing.model';
import { CreateOrderRequest } from '@model/billing/request/billing-request';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly api = inject(BillingApiService);
  current() {
    return this.api.get<CurrentSubscription>('subscriptions/current');
  }
  orders(page = 0) {
    return this.api.page<SubscriptionOrder>('subscriptions/orders', page);
  }
  allOrders() {
    return this.api.all<SubscriptionOrder>('subscriptions/orders');
  }
  order(id: string) {
    return this.api.get<SubscriptionOrder>(`subscriptions/orders/${encodeURIComponent(id)}`);
  }
  create(body: CreateOrderRequest) {
    return this.api.send<SubscriptionOrder>('POST', 'subscriptions/orders', body);
  }
  history(page = 0) {
    return this.api.page<Subscription>('subscriptions/history', page);
  }
  periods(page = 0) {
    return this.api.page<SubscriptionPeriod>('subscriptions/periods', page);
  }
  awaiting(page = 0) {
    return this.api.page<SubscriptionOrder>('subscriptions/orders/awaiting-confirmation', page);
  }
  confirm(id: string) {
    return this.api.send<SubscriptionOrder>(
      'POST',
      `subscriptions/orders/${encodeURIComponent(id)}/confirm`,
    );
  }
}
