export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
export interface PageResponse<T> {
  rankingSession?: string;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  data: T[];
}
