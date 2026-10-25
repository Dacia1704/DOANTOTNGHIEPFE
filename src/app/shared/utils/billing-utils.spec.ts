import { BillingUtils } from './billing-utils';
import { CurrentSubscription, SubscriptionOrder } from '@model/billing/billing.model';

describe('Billing service package rules', () => {
  it('distinguishes expired paid rights from Free and chooses PURCHASE', () => {
    const current = { free: false, canSubmitListings: false } as CurrentSubscription;
    expect(BillingUtils.orderType(current, 'same', 'same')).toBe('PURCHASE');
  });
  it('renews only the current paid package and treats another package as CHANGE', () => {
    const current = { free: false, canSubmitListings: true } as CurrentSubscription;
    expect(BillingUtils.orderType(current, 'current', 'current')).toBe('RENEW');
    expect(BillingUtils.orderType(current, 'other', 'current')).toBe('CHANGE');
  });
  it('ignores expired pending changes while retaining confirmed schedules', () => {
    const orders = [
      {
        id: 'expired',
        type: 'CHANGE',
        status: 'PENDING_PAYMENT',
        expiresAt: new Date(Date.now() - 1),
      },
      { id: 'schedule', type: 'CHANGE', status: 'SCHEDULED' },
    ] as SubscriptionOrder[];
    expect(BillingUtils.openChange(orders)?.id).toBe('schedule');
  });
});
