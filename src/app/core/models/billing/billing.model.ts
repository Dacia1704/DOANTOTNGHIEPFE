export interface ResultPage<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}
export interface PackageRights {
  packageCode: string;
  packageName: string;
  maxListings: number | null;
  highPrioritySlots: number;
  lowPrioritySlots: number;
  defaultPriorityLevel: number;
  hasStats: boolean;
}
export interface ServicePackage {
  id: string;
  code: string;
  name: string;
  maxListings: number | null;
  highPrioritySlots: number;
  lowPrioritySlots: number;
  defaultPriorityLevel: number;
  hasStats: boolean;
  active: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}
export interface PriceOption {
  id: string;
  packageId: string;
  durationMonths: number;
  price: number;
  active: boolean;
}
export type OrderType = 'PURCHASE' | 'RENEW' | 'CHANGE';
export type PaymentType = 'SERVICE_PACKAGE' | 'BOOST_PACKAGE';
export interface SubscriptionOrder {
  id: string;
  landlordId: string;
  packageId: string;
  priceOptionId: string;
  subscriptionId: string | null;
  previousSubscriptionId: string | null;
  type: OrderType;
  status: string;
  durationMonths: number;
  price: number;
  /** Absent only for responses from older backends; classification is always server-owned. */
  immediateUpgrade?: boolean;
  rights: PackageRights;
  expiresAt: Date | null;
  effectiveAt: Date | null;
  endAt: Date | null;
  appliedAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date | null;
}
export interface SubscriptionPeriod {
  id: string;
  subscriptionId: string;
  orderId: string;
  periodNumber: number;
  startAt: Date | null;
  endAt: Date | null;
  rights: PackageRights;
}
export interface Subscription {
  id: string;
  packageId: string;
  status: string;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date | null;
}
export interface CurrentSubscription {
  subscriptionId: string | null;
  free: boolean;
  canSubmitListings: boolean;
  subscriptionEndsAt: Date | null;
  currentPeriod: SubscriptionPeriod | null;
  nextPeriod: SubscriptionPeriod | null;
  rights: PackageRights;
  scheduledChange: SubscriptionOrder | null;
}
export interface BoostPackage {
  id: string;
  code: string;
  name: string;
  highPrioritySlots: number;
  lowPrioritySlots: number;
  durationMonths: number | null;
  price: number;
  active: boolean;
}
export interface BoostSubscription {
  id: string;
  boostPackageId: string;
  packageNameSnapshot: string;
  highPrioritySlotsSnapshot: number;
  lowPrioritySlotsSnapshot: number;
  durationMonthsSnapshot: number;
  price: number;
  status: string;
  startAt: Date | null;
  endAt: Date | null;
  paymentExpiresAt: Date | null;
  createdAt: Date | null;
}
export interface BoostAllocation {
  listingId: string;
  boostSubscriptionId: string;
  level: 1 | 2;
}
export interface ActiveBoost {
  subscription: BoostSubscription;
  usedHighPrioritySlots: number;
  usedLowPrioritySlots: number;
  remainingHighPrioritySlots: number;
  remainingLowPrioritySlots: number;
  allocations: BoostAllocation[];
}
export interface Listing {
  id: string;
  roomId: string;
  landlordId: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  rejectionReason: string | null;
  priorityLevel: number;
  packagePriorityLevel: number;
  submittedAt: Date | null;
  pendingExpiresAt: Date | null;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date | null;
}
export interface Payment {
  id: string;
  type: PaymentType;
  targetId: string;
  merchantOrderId: string;
  amount: number;
  status: string;
  expiresAt: Date | null;
  paidAt: Date | null;
  requiresReview: boolean;
  reviewReason: string | null;
  invoiceId: string | null;
}
export interface Invoice {
  id: string;
  invoiceNo: string;
  taxAmount: number;
  totalAmount: number;
  buyerName: string;
  issuedAt: Date | null;
}
export interface Checkout {
  payment: Payment;
  paymentUrl: string;
}
export interface PaymentCheck {
  payment: Payment;
  providerResponseCode: string;
  providerTransactionStatus: string;
  message: string;
}
