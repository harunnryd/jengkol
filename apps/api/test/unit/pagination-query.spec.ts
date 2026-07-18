import { PaginationQueryDto, buildPaginationMeta } from '@/common/dto/pagination-query.dto';

describe('PaginationQueryDto', () => {
  it.each([
    { page: 1, limit: 20, expectedSkip: 0, expectedTake: 20 },
    { page: 2, limit: 20, expectedSkip: 20, expectedTake: 20 },
    { page: 3, limit: 10, expectedSkip: 20, expectedTake: 10 },
  ])(
    'page $page / limit $limit -> skip $expectedSkip, take $expectedTake',
    ({ page, limit, expectedSkip, expectedTake }) => {
      const pagination = new PaginationQueryDto();
      pagination.page = page;
      pagination.limit = limit;

      expect(pagination.skip).toBe(expectedSkip);
      expect(pagination.take).toBe(expectedTake);
    },
  );
});

describe('buildPaginationMeta', () => {
  it.each([
    { page: 1, limit: 20, total: 45, expectedTotalPages: 3 },
    { page: 1, limit: 20, total: 0, expectedTotalPages: 0 },
    { page: 2, limit: 10, total: 10, expectedTotalPages: 1 },
  ])(
    'total $total / limit $limit -> $expectedTotalPages pages',
    ({ page, limit, total, expectedTotalPages }) => {
      const pagination = new PaginationQueryDto();
      pagination.page = page;
      pagination.limit = limit;

      const meta = buildPaginationMeta(pagination, total);

      expect(meta).toEqual({ page, limit, total, totalPages: expectedTotalPages });
    },
  );
});
