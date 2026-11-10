import type { AbstractControl, FormGroup, ValidatorFn } from '@angular/forms';
import type { ApiError } from '../api/api-error';

/** Length rules measured after trimming, like the API. min > 0 also makes the field required. */
export function trimmedLength(min: number, max: number): ValidatorFn {
  return (control) => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    if (min > 0 && value.length === 0) return { required: true };
    if (value.length < min) return { minlength: { requiredLength: min, actualLength: value.length } };
    if (value.length > max) return { maxlength: { requiredLength: max, actualLength: value.length } };
    return null;
  };
}

/** The message to show under a field, once the user has touched it. */
export function controlError(control: AbstractControl | null, label: string, patternMessage?: string): string | null {
  if (!control?.errors || !control.touched) return null;
  const errors = control.errors;
  if (errors['server']) return String(errors['server']);
  if (errors['required']) return `${label} is required`;
  if (errors['email']) return 'Enter a valid email address';
  if (errors['minlength']) return `${label} must be at least ${errors['minlength'].requiredLength} characters`;
  if (errors['maxlength']) return `${label} must be at most ${errors['maxlength'].requiredLength} characters`;
  if (errors['pattern']) return patternMessage ?? `${label} is invalid`;
  return `${label} is invalid`;
}

/**
 * Puts API validation details on the matching controls (by `field`).
 * Returns a form-level message for anything that doesn't map to a control.
 */
export function applyServerErrors(form: FormGroup, error: ApiError): string | null {
  const unmatched: string[] = [];
  for (const detail of error.details) {
    const control = detail.field ? form.get(detail.field) : null;
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: detail.message });
      control.markAsTouched();
    } else {
      unmatched.push(detail.message);
    }
  }
  if (unmatched.length) return unmatched.join(' ');
  return error.details.length ? null : error.message;
}

/** aria-describedby value for a FormField input. */
export function describedBy(id: string, error: string | null, hasHint = false): string | null {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : null;
}
