import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from './icon';

@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center' },
  template: `
    <span class="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
      <app-icon [name]="icon()" size="lg" />
    </span>
    <p class="text-base font-semibold text-ink">{{ title() }}</p>
    @if (description()) {
      <p class="max-w-xs text-sm text-ink-secondary">{{ description() }}</p>
    }
    <ng-content />
  `,
})
export class EmptyState {
  readonly icon = input<IconName>('chat');
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
