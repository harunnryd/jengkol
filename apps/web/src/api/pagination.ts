export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export function paginationQuery(page: number, limit = 20): string {
  return `?page=${page}&limit=${limit}`;
}
