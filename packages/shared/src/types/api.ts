/**
 * Standard API error shape.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Standard API response envelope.
 * Every API endpoint returns this shape.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  requestId?: string;
}
