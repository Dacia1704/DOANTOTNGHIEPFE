import { PropertyResponse } from './response/property-response';
import { Property } from './property.model';
import { RoomMapper } from '../room/room.mapper';
import { RoomRentalStatus } from '../room/room.model';

export class PropertyMapper {
  static fromResponse(dto: PropertyResponse): Property {
    const rooms = RoomMapper.fromResponseList(dto.rooms ?? []).map((room) => ({
      ...room,
      displayName: dto.rentalMode === 'WHOLE' ? 'Toàn bộ cơ sở' : room.displayName,
    }));
    const prices = rooms.map((room) => room.price).filter(Number.isFinite);
    return {
      id: dto.id,
      name: /^Cơ sở [0-9a-f-]{36}$/i.test(dto.name) ? `Cơ sở tại ${dto.addressLine}` : dto.name,
      propertyTypeId: dto.propertyTypeId,
      propertyTypeName:
        dto.propertyTypeId === '00000000-0000-0000-0000-000000000011'
          ? 'Chưa phân loại'
          : dto.propertyTypeName,
      rentalMode: dto.rentalMode,
      rentalModeLabel: dto.rentalMode === 'WHOLE' ? 'Cho thuê nguyên căn' : 'Cho thuê từng phòng',
      totalFloors: dto.totalFloors ?? null,
      fullAddress: [dto.addressLine, dto.wardName, dto.provinceName].filter(Boolean).join(', '),
      amenities: (dto.amenities ?? []).map((a) => ({ ...a, icon: a.icon || 'check_circle' })),
      images: (dto.images ?? []).map((i) => ({
        ...i,
        sortOrder: i.sortOrder ?? 0,
        createdAt: i.createdAt ? new Date(i.createdAt) : null,
      })),
      rooms,
      availableCount: rooms.filter((r) => r.rentalStatus === RoomRentalStatus.AVAILABLE).length,
      rentedCount: rooms.filter((r) => r.rentalStatus === RoomRentalStatus.RENTED).length,
      maintenanceCount: rooms.filter((r) => r.rentalStatus === RoomRentalStatus.MAINTENANCE).length,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : null,
    };
  }
}
