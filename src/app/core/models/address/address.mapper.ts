import { Province, ProvinceResponse } from './province.model';
import { Ward, WardResponse } from './ward.model';

export class AddressMapper {
  static fromProvinceResponse(dto: ProvinceResponse): Province {
    return {
      id: dto.id,
      code: dto.code,
      name: dto.name,
    };
  }

  static fromProvinceResponseList(dtos: ProvinceResponse[]): Province[] {
    return (dtos || []).map(dto => this.fromProvinceResponse(dto));
  }

  static fromWardResponse(dto: WardResponse): Ward {
    return {
      id: dto.id,
      code: dto.code,
      name: dto.name,
      provinceId: dto.provinceId,
      provinceCode: dto.provinceCode,
      provinceName: dto.provinceName,
    };
  }

  static fromWardResponseList(dtos: WardResponse[]): Ward[] {
    return (dtos || []).map(dto => this.fromWardResponse(dto));
  }
}
