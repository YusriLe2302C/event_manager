class ApiResponse {
  static success(res, message, data = {}, statusCode = 200) {
    return res.status(statusCode).json({ success: true, message, data });
  }

  static created(res, message, data = {}) {
    return ApiResponse.success(res, message, data, 201);
  }

  static paginated(res, message, data, pagination) {
    return res.status(200).json({ success: true, message, data, pagination });
  }
}

module.exports = ApiResponse;
