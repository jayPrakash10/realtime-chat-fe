import { IMAGE_MIME_TYPES, LIMITS } from './constants';

/** Same rules and wording as the API, so users see the error before uploading. */
export function validateImageFile(file: File): string | null {
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) return 'Only JPG, PNG and WEBP images are allowed';
  if (file.size > LIMITS.imageMaxBytes) return 'Image must be 5 MB or smaller';
  return null;
}
