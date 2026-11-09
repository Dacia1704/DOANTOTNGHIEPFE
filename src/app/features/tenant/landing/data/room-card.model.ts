export interface RoomCard {
  id: string;
  image: string;
  imageAlt: string;
  isPriority?: boolean;
  isVerified?: boolean;
  categoryLabel: string;
  categoryIcon: string;
  rating: number;
  reviewCount: number;
  /** AI recommendation cards only: '98%' / '95%' / ... */
  matchBadge?: string;
  badgeKind?: 'primary' | 'secondary';
  badgeIcon?: string;
  badgeLabel?: string;
  title: string;
  address: string;
  distance: string;
  tags: string[];
  price: number;
  priceUnit: string;
  extraLabel: string;
  isArea?: boolean;
  hostInitials: string;
  hostName: string;
}
