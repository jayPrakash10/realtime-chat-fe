import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from './icon';

export interface FieldCounter {
  current: number;
  max: number;
}

/**
 * Label, hint, error and character counter around a projected input.
 * The input should set aria-describedby with describedBy() from lib/form-errors.
 */
@Component({
  selector: 'app-form-field',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-1.5' },
  template: `
    <div class="flex items-baseline justify-between gap-2">
      <label [for]="fieldId()" class="text-sm font-medium text-ink">{{ label() }}</label>
      @if (counter(); as c) {
        <span class="text-xs" [class]="c.current > c.max ? 'text-danger-600' : 'text-ink-meta'" aria-hidden="true">
          {{ c.current }}/{{ c.max }}
        </span>
      }
    </div>
    <ng-content />
    @if (error()) {
      <p [id]="fieldId() + '-error'" class="flex items-center gap-1 text-xs text-danger-600">
        <app-icon name="alert" size="sm" />
        {{ error() }}
      </p>
    } @else if (hint()) {
      <p [id]="fieldId() + '-hint'" class="text-xs text-ink-meta">{{ hint() }}</p>
    }
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly fieldId = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly counter = input<FieldCounter | null>(null);
}
