export interface IPagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

class ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  pagination?: IPagination;

  constructor(
    message: string = "Success",
    data?: any,
    pagination?: IPagination,
    success: boolean = true,
  ) {
    this.success = success;
    this.message = message;
    if (data !== undefined) this.data = data;
    if (pagination !== undefined) this.pagination = pagination;
  }

  static success(data?: any, message: string = "Success"): ApiResponse {
    return new ApiResponse(message, data);
  }

  static error(message: string = "Error", data?: any): ApiResponse {
    return new ApiResponse(message, data, undefined, false);
  }

  static successWithPagination(
    data: any,
    pagination: IPagination,
    message: string = "Success",
  ): ApiResponse {
    const res = new ApiResponse(message, data);
    res.pagination = pagination;
    return res;
  }
}

export default ApiResponse;
