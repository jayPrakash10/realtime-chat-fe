import { Pipe, type PipeTransform } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Image paths from the API are relative ("/uploads/..."). They are served from the
 * server origin, never the /api/v1 base. Absolute, data: and blob: URLs pass through.
 */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${environment.serverOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
}

@Pipe({ name: 'mediaUrl' })
export class MediaUrlPipe implements PipeTransform {
  transform(path: string | null | undefined): string | null {
    return resolveMediaUrl(path);
  }
}
