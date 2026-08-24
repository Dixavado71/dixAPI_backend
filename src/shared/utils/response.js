export function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function paginatedResponse(res, data, pagination, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination,
  });
}

export function createdResponse(res, data) {
  return res.status(201).json({
    success: true,
    data,
  });
}

export function noContentResponse(res) {
  return res.status(204).send();
}

export default {
  successResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
};
