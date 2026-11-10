import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from './button';
import { Icon } from './icon';

@Component({
  selector: 'app-error-state',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', role: 'alert' },
  template: `
    <span class="flex size-14 items-center justify-center rounded-full bg-danger-50 text-danger-600">
      <app-icon name="alert" size="lg" />
    </span>
    <p class="text-base font-semibold text-ink">{{ title() }}</p>
    <p class="max-w-xs text-sm text-ink-secondary">{{ message() }}</p>
    <button appButton variant="secondary" size="sm" type="button" (click)="retry.emit()">Try again</button>
  `,
})
export class ErrorState {
  readonly title = input("Couldn't load this");
  readonly message = input.required<string>();
  readonly retry = output<void>();
}
