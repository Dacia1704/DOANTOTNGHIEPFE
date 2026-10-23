export interface WardResponse {
  id: string;
  code: string;
  name: string;
  provinceId: string;
  provinceCode: string;
  provinceName: string;
}

export interface Ward {
  id: string;
  code: string;
  name: string;
  provinceId: string;
  provinceCode: string;
  provinceName: string;
}

export interface WardList {
  items: Ward[];
  page: number;
  totalPages: number;
  total: number;
}
