import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Loading indicator. With a label it is announced (role="status"); without one it is decorative. */
@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
    '[attr.role]': 'label() ? "status" : null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
  },
  template: `
    <svg viewBox="0 0 24 24" fill="none" class="size-full animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.25" stroke-width="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
    @if (label()) {
      <span class="sr-only">{{ label() }}</span>
    }
  `,
})
export class Spinner {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly label = input<string | null>(null);

  protected readonly hostClass = computed(() => {
    const size = { sm: 'size-4', md: 'size-5', lg: 'size-8' }[this.size()];
    return `inline-block shrink-0 text-brand-600 ${size}`;
  });
}
