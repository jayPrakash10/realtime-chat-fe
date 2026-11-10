import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  secondary: 'border border-border bg-surface text-ink hover:bg-surface-muted',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

/** Native <button> or <a> with design-system styles: <button appButton variant="primary">. */
@Component({
  selector: 'button[appButton], a[appButton]',
  imports: [Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'disabled() || loading() ? "" : null',
    '[attr.aria-busy]': 'loading() ? "true" : null',
  },
  template: `
    @if (loading()) {
      <app-spinner size="sm" class="text-current" />
    }
    <ng-content />
  `,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly loading = input(false);
  readonly disabled = input(false);

  protected readonly classes = computed(
    () =>
      'inline-flex shrink-0 items-center justify-center gap-2 rounded-sm font-medium whitespace-nowrap ' +
      'transition-colors disabled:cursor-not-allowed disabled:opacity-60 ' +
      `${SIZES[this.size()]} ${VARIANTS[this.variant()]}`,
  );
}
