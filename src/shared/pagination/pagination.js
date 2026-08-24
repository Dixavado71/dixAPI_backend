export function buildPaginationOptions(page = 1, limit = 20) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  
  const skip = (safePage - 1) * safeLimit;
  
  return {
    skip,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
  };
}

export function buildPaginationResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export default {
  buildPaginationOptions,
  buildPaginationResponse,
};
