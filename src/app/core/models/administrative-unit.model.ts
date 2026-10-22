export interface Province {
  id: string;
  code: string;
  name: string;
}

export interface WardRequest {
  code: string;
  name: string;
  provinceId: string;
}

export interface Ward extends WardRequest {
  id: string;
  provinceCode: string;
  provinceName: string;
}
