import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2.5' },
  template: `
    <span
      class="flex items-center justify-center rounded-lg bg-brand-600 text-white"
      [class]="size() === 'lg' ? 'size-12' : 'size-9'"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" class="size-3/5" fill="currentColor">
        <path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.4 1.1 4.6 3 6.2L4 22l4.6-2.2c1.1.4 2.2.6 3.4.6 5.5 0 10-3.9 10-8.7S17.5 3 12 3Z" />
      </svg>
    </span>
    @if (showName()) {
      <span class="font-semibold tracking-tight text-ink" [class]="size() === 'lg' ? 'text-2xl' : 'text-lg'">
        Chat<span class="text-brand-700">Nest</span>
      </span>
    }
  `,
})
export class Logo {
  readonly size = input<'md' | 'lg'>('md');
  readonly showName = input(true);
}
