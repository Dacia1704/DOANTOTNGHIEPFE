import { Property } from '../property/property.model';
import { RoomAmenity } from '../room/room.model';
export interface PublicListing {
  id: string;
  listingId: string;
  listingTitle: string;
  listingDescription: string;
  publishedAt: Date;
  expiresAt: Date;
  priorityLevel: number;
  propertyName: string;
  rentalMode: 'WHOLE' | 'BY_ROOM';
  landlordName: string;
  property: Property;
  price: number;
  thumbnail: string;
  fullAddress: string;
  categoryLabel: string;
  extraLabel: string;
  amenities: RoomAmenity[];
}
export interface PublicListingList {
  items: PublicListing[];
  page: number;
  totalPages: number;
  total: number;
}
