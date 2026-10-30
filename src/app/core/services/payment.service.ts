import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
import { BillingApiService } from './billing-api.service';
import { AuthService } from './auth.service';
import {
  Checkout,
  Invoice,
  Payment,
  PaymentCheck,
  PaymentType,
} from '@model/billing/billing.model';
import { CheckoutRequest } from '@model/billing/request/billing-request';

interface PaymentReference {
  id: string;
  merchantOrderId: string;
  type: PaymentType;
  targetId: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = inject(BillingApiService);
  private readonly auth = inject(AuthService);
  private readonly memory = new Map<string, PaymentReference[]>();
  list(page = 0) {
    return this.api.page<Payment>('payments', page);
  }
  review(page = 0) {
    return this.api.page<Payment>('payments/review', page);
  }
  get(id: string) {
    return this.api.get<Payment>(`payments/${encodeURIComponent(id)}`);
  }
  invoice(id: string) {
    return this.api.get<Invoice>(`payments/${encodeURIComponent(id)}/invoice`);
  }
  check(id: string) {
    return this.api.send<PaymentCheck>('POST', `payments/${encodeURIComponent(id)}/check`);
  }
  checkout(body: CheckoutRequest) {
    return this.api
      .send<Checkout>('POST', 'payments/vnpay/checkout', body)
      .pipe(tap((result) => this.remember(result.payment)));
  }
  remember(payment: Payment): void {
    const key = this.key();
    const refs = this.references().filter((ref) => ref.id !== payment.id);
    refs.push({
      id: payment.id,
      merchantOrderId: payment.merchantOrderId,
      type: payment.type,
      targetId: payment.targetId,
    });
    this.memory.set(key, refs);
    try {
      localStorage.setItem(key, JSON.stringify(refs));
    } catch {
      /* In-memory recovery remains available. */
    }
  }
  resolve(merchantOrderId: string): string | null {
    return this.references().find((ref) => ref.merchantOrderId === merchantOrderId)?.id ?? null;
  }
  private key(): string {
    return `trotot_payments:${this.auth.session()?.id ?? 'anonymous'}`;
  }
  private references(): PaymentReference[] {
    try {
      const refs: unknown = JSON.parse(localStorage.getItem(this.key()) ?? 'null');
      if (Array.isArray(refs))
        return refs.filter(
          (ref) => ref && typeof ref.id === 'string' && typeof ref.merchantOrderId === 'string',
        );
    } catch {
      /* Storage may be unavailable. */
    }
    return this.memory.get(this.key()) ?? [];
  }
}
