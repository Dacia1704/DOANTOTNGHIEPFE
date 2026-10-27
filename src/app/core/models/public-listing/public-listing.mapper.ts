import { PublicListing } from './public-listing.model';
import { PublicListingResponse } from './response/public-listing-response';
import { PropertyMapper } from '../property/property.mapper';
export class PublicListingMapper {
  static fromResponse(dto: PublicListingResponse): PublicListing {
    const property = PropertyMapper.fromResponse(dto.property);
    const available = property.rooms.filter((room) => room.rentalStatus === 'AVAILABLE');
    const pricedRooms = available.length ? available : property.rooms;
    const prices = pricedRooms.map((room) => room.price);
    const ownImage = property.rooms.find((room) => room.thumbnail)?.thumbnail;
    return {
      id: dto.id,
      listingId: dto.id,
      listingTitle: dto.title,
      listingDescription: dto.description ?? '',
      publishedAt: this.date(dto.publishedAt),
      expiresAt: this.date(dto.expiresAt),
      priorityLevel: dto.priorityLevel ?? 0,
      propertyName: property.name,
      rentalMode: property.rentalMode,
      landlordName: dto.landlordName || 'Chủ nhà',
      property,
      price: prices.length ? Math.min(...prices) : 0,
      thumbnail: property.images[0]?.url || ownImage || '',
      fullAddress: property.fullAddress,
      categoryLabel:
        property.rentalMode === 'WHOLE' ? 'Cho thuê nguyên căn' : property.propertyTypeName,
      extraLabel:
        property.rentalMode === 'WHOLE'
          ? `${property.rooms[0]?.areaM2 ?? '—'} m²`
          : `${property.availableCount} phòng trống`,
      amenities: property.amenities,
    };
  }
  private static date(value: string): Date {
    return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}+07:00`);
  }
}
