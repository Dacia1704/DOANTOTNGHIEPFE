import { OrderType, PaymentType, ServicePackage } from '../billing.model';
export interface CreateOrderRequest {
  priceOptionId: string;
  type: OrderType;
}
export interface CheckoutRequest {
  type: PaymentType;
  targetId: string;
}
export interface CreateBoostRequest {
  boostPackageId: string;
}
export interface AllocateBoostRequest {
  boostSubscriptionId: string;
  level: 1 | 2;
}
export type SavePackageRequest = Omit<ServicePackage, 'id' | 'createdAt' | 'updatedAt'>;
export interface SavePriceRequest {
  durationMonths: number;
  price: number;
  active: boolean;
}
export interface SaveBoostPackageRequest extends SavePriceRequest {
  code: string;
  name: string;
  highPrioritySlots: number;
  lowPrioritySlots: number;
}
export interface SaveListingRequest {
  roomId: string;
  title: string;
  description: string;
}
