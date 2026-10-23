import { AmenityResponse } from './response/amenity-response';
import { Amenity } from './amenity.model';

export class AmenityMapper {
  static fromResponse(dto: AmenityResponse): Amenity {
    return {
      id: dto.id,
      name: dto.name,
      icon: dto.icon ?? 'check_circle',
      createdAt: dto.createdAt ? new Date(dto.createdAt) : null,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
    };
  }

  static fromResponseList(dtos: AmenityResponse[]): Amenity[] {
    return (dtos || []).map(dto => this.fromResponse(dto));
  }
}
