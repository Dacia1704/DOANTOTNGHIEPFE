import { PublicListing } from './public-listing.model';
import { PublicListingResponse } from './response/public-listing-response';
import { PropertyMapper } from '../property/property.mapper';
import { RoomQueryParams } from '../room/request/room-query-params';
export class PublicListingMapper {
  static fromResponse(dto: PublicListingResponse, query?: RoomQueryParams): PublicListing {
    const property = PropertyMapper.fromResponse(dto.property);
    if (query) {
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('vi')
          .replace(/đ/g, 'd')
          .trim();
      const within = (value: number | null, min?: number, max?: number) =>
        (min == null && max == null) ||
        (value != null && (min == null || value >= min) && (max == null || value <= max));
      property.rooms = property.rooms.filter(
        (room) =>
          (!query.roomTypeName || normalize(query.roomTypeName) === normalize(room.roomTypeName)) &&
          (!query.rentalStatus || room.rentalStatus === query.rentalStatus) &&
          (query.rentalStatus !== 'AVAILABLE' || room.bookingAvailability === 'AVAILABLE') &&
          within(room.price, query.minPrice, query.maxPrice) &&
          within(room.areaM2, query.minArea, query.maxArea) &&
          (query.minOccupants == null || room.maxOccupants >= query.minOccupants) &&
          within(room.floorNumber, query.minFloor, query.maxFloor) &&
          within(room.defaultDeposit, undefined, query.maxDeposit) &&
          within(room.electricityPrice, undefined, query.maxElectricityPrice) &&
          within(room.waterPrice, undefined, query.maxWaterPrice) &&
          within(room.serviceFee, undefined, query.maxServiceFee) &&
          (query.amenityNames || []).every((name) =>
            [...property.amenities, ...room.amenities].some(
              (a) => normalize(a.name) === normalize(name),
            ),
          ),
      );
      property.availableCount = property.rooms.filter(
        (room) => room.bookingAvailability === 'AVAILABLE',
      ).length;
    }
    const available = property.rooms.filter((room) => room.bookingAvailability === 'AVAILABLE');
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
      amenities: query
        ? [
            ...new Map(
              [...property.amenities, ...property.rooms.flatMap((room) => room.amenities)].map(
                (amenity) => [amenity.id, amenity],
              ),
            ).values(),
          ]
        : property.amenities,
    };
  }
  private static date(value: string): Date {
    return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}+07:00`);
  }
}
