export interface AppNotification {
  id: string;
  type: 'SYSTEM' | 'RENTAL_REQUEST' | 'RENTAL_AGREEMENT' | 'REPORT' | 'CHAT';
  title: string;
  body: string;
  referenceType: string | null;
  referenceId: string | null;
  read: boolean;
  createdAt: string;
}
