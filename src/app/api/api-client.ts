import { Injectable, inject } from '@angular/core';
import axios, { type AxiosProgressEvent, type InternalAxiosRequestConfig } from 'axios';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiError } from './api-error';
import { TokenStorage } from './token-storage';
import type { ApiCursorPage, ApiPage, ApiSuccess, CursorPage, Page } from './types';

export type AuthFailure = 'unauthorized' | 'banned';

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** 401/403 on these paths belong to the form that sent them, so they never trigger a global logout. */
const CREDENTIAL_PATHS = ['/auth/login', '/auth/register'];

/**
 * The only place that talks HTTP. It unwraps the success envelope, attaches the
 * Bearer token, and turns every failure into an ApiError.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly tokens = inject(TokenStorage);
  private readonly http = axios.create({ baseURL: environment.apiBaseUrl, timeout: 30_000 });

  /** Emits when an authenticated request shows the session is no longer valid. */
  readonly authFailures = new Subject<AuthFailure>();

  constructor() {
    this.http.interceptors.request.use((config) => this.withToken(config));
    this.http.interceptors.response.use(undefined, (error: unknown) => Promise.reject(this.normalize(error)));
  }

  async get<T>(url: string, params?: object): Promise<T> {
    const { data } = await this.http.get<ApiSuccess<T>>(url, { params });
    return data.data;
  }

  async getPage<T>(url: string, params?: object): Promise<Page<T>> {
    const { data } = await this.http.get<ApiPage<T>>(url, { params });
    return { items: data.data, meta: data.meta };
  }

  async getCursorPage<T>(url: string, params?: object): Promise<CursorPage<T>> {
    const { data } = await this.http.get<ApiCursorPage<T>>(url, { params });
    return { items: data.data, meta: data.meta };
  }

  async post<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await this.http.post<ApiSuccess<T>>(url, body);
    return data.data;
  }

  async patch<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await this.http.patch<ApiSuccess<T>>(url, body);
    return data.data;
  }

  /** For 204 endpoints: there is no body to read. */
  async delete(url: string, params?: object): Promise<void> {
    await this.http.delete(url, { params });
  }

  /** Multipart upload. The browser sets the multipart Content-Type and boundary itself. */
  async upload<T>(method: 'post' | 'put', url: string, form: FormData, options: UploadOptions = {}): Promise<T> {
    const { data } = await this.http.request<ApiSuccess<T>>({
      method,
      url,
      data: form,
      signal: options.signal,
      timeout: 120_000,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (event.total) options.onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data.data;
  }

  private withToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    const token = this.tokens.get();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  }

  private normalize(error: unknown): ApiError {
    const apiError = ApiError.from(error);
    const url = axios.isAxiosError(error) ? (error.config?.url ?? '') : '';
    if (!CREDENTIAL_PATHS.some((path) => url.startsWith(path))) {
      if (apiError.status === 401) this.authFailures.next('unauthorized');
      else if (apiError.isBanned) this.authFailures.next('banned');
    }
    return apiError;
  }
}
