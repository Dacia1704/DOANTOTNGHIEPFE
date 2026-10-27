import { PropertyType } from './property-type.model';
import { PropertyTypeResponse } from './response/property-type-response';
export class PropertyTypeMapper {
  static fromResponse(dto: PropertyTypeResponse): PropertyType {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description ?? '',
      createdAt: dto.createdAt ? new Date(dto.createdAt) : null,
    };
  }
}
