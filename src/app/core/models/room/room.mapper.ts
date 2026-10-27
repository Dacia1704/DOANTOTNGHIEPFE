import { RoomResponse } from './response/room-response';
import { Room, RoomRentalStatus } from './room.model';

export class RoomMapper {
  static fromResponse(dto: RoomResponse): Room {
    const images = (dto.images || []).map((img) => ({
      id: img.id,
      url: img.url,
      sortOrder: img.sortOrder ?? 0,
      createdAt: img.createdAt ? new Date(img.createdAt) : null,
    }));

    const amenities = (dto.amenities || []).map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon || 'check_circle',
    }));

    const fullAddress = [dto.addressLine, dto.wardName, dto.provinceName]
      .filter(Boolean)
      .join(', ');

    const thumbnail = images.length > 0 ? images[0].url : '';

    return {
      id: dto.id,
      propertyId: dto.propertyId,
      roomNumber: dto.roomNumber,
      displayName: dto.roomNumber === 'LEGACY' ? 'Đơn vị cho thuê' : dto.roomNumber,
      floorNumber: dto.floorNumber ?? null,
      landlordId: dto.landlordId,
      roomTypeId: dto.roomTypeId,
      roomTypeName: dto.roomTypeName,
      price: dto.price,
      electricityPrice: dto.electricityPrice ?? null,
      waterPrice: dto.waterPrice ?? null,
      serviceFee: dto.serviceFee ?? null,
      defaultDeposit: dto.defaultDeposit ?? null,
      areaM2: dto.areaM2,
      maxOccupants: dto.maxOccupants,
      provinceId: dto.provinceId,
      provinceName: dto.provinceName ?? '',
      wardId: dto.wardId,
      wardName: dto.wardName ?? '',
      addressLine: dto.addressLine,
      fullAddress,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      rentalStatus: dto.rentalStatus || RoomRentalStatus.AVAILABLE,
      amenities,
      images,
      thumbnail,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : null,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
    };
  }

  static fromResponseList(dtos: RoomResponse[]): Room[] {
    return (dtos || []).map((dto) => this.fromResponse(dto));
  }
}
