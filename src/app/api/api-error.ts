import axios from 'axios';
import { API_MESSAGES } from '../lib/constants';
import type { ApiErrorResponse, ValidationDetail } from './types';

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again.";
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

/** The single error type every API call rejects with. `message` is always safe to show to users. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: readonly ValidationDetail[] = [],
    readonly canceled = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isBanned(): boolean {
    return this.status === 403 && this.message === API_MESSAGES.banned;
  }

  get isCannotMessage(): boolean {
    return this.status === 403 && this.message === API_MESSAGES.cannotMessage;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (axios.isCancel(error)) return new ApiError(0, 'Request canceled', [], true);
    if (axios.isAxiosError(error)) {
      const response = error.response;
      if (!response) return new ApiError(0, NETWORK_MESSAGE);
      const body = response.data as Partial<ApiErrorResponse> | undefined;
      const message = body?.error?.message ?? fallbackMessage(response.status);
      return new ApiError(response.status, message, body?.error?.details ?? []);
    }
    return new ApiError(0, GENERIC_MESSAGE);
  }
}

function fallbackMessage(status: number): string {
  if (status === 413) return 'File is too large';
  if (status >= 500) return 'Internal server error';
  return `Request failed (${status})`;
}
