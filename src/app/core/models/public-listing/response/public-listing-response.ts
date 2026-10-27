import { PropertyResponse } from '../../property/response/property-response';
export interface PublicListingResponse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priorityLevel: number;
  publishedAt: string;
  expiresAt: string;
  propertyId: string;
  property: PropertyResponse;
  propertyName: string;
  rentalMode: 'WHOLE' | 'BY_ROOM';
  landlordName?: string | null;
}
