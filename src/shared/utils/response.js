export function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function createdResponse(res, data) {
  return res.status(201).json({
    success: true,
    data,
  });
}

export default {
  successResponse,
  createdResponse,
};
