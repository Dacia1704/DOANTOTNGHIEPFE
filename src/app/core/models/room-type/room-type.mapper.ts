import { RoomTypeResponse } from './response/room-type-response';
import { RoomTypeCategoryResponse } from './response/room-type-category-response';
import { RoomType, RoomTypeCategory } from './room-type.model';

export class RoomTypeMapper {
  static fromResponse(dto: RoomTypeResponse): RoomType {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description ?? '',
      parentId: dto.parentId ?? null,
      parentName: dto.parentName ?? '',
      createdAt: dto.createdAt ? new Date(dto.createdAt) : null,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
    };
  }

  static fromResponseList(dtos: RoomTypeResponse[]): RoomType[] {
    return (dtos || []).map(dto => this.fromResponse(dto));
  }

  static fromCategoryResponse(dto: RoomTypeCategoryResponse): RoomTypeCategory {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description ?? '',
      parentId: dto.parentId ?? null,
      rooms: (dto.rooms || []).map(r => ({
        id: r.id,
        price: r.price,
        areaM2: r.areaM2,
        maxOccupants: r.maxOccupants,
        addressLine: r.addressLine ?? '',
        provinceName: r.provinceName ?? '',
        wardName: r.wardName ?? '',
        rentalStatus: r.rentalStatus,
      })),
    };
  }

  static fromCategoryResponseList(dtos: RoomTypeCategoryResponse[]): RoomTypeCategory[] {
    return (dtos || []).map(dto => this.fromCategoryResponse(dto));
  }
}
