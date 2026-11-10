import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';
import { Icon } from '../../ui/icon';

/** Password input with a show/hide toggle. */
@Component({
  selector: 'app-password-input',
  imports: [ReactiveFormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
  template: `
    <input
      class="input pr-11"
      [id]="inputId()"
      [type]="visible() ? 'text' : 'password'"
      [formControl]="control()"
      [attr.autocomplete]="autocomplete()"
      [attr.aria-invalid]="invalid() ? 'true' : null"
      [attr.aria-describedby]="describedBy()"
    />
    <button
      type="button"
      class="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-meta hover:text-ink"
      [attr.aria-label]="visible() ? 'Hide password' : 'Show password'"
      [attr.aria-pressed]="visible()"
      [attr.aria-controls]="inputId()"
      (click)="visible.set(!visible())"
    >
      <app-icon [name]="visible() ? 'eye-off' : 'eye'" size="sm" />
    </button>
  `,
})
export class PasswordInput {
  readonly control = input.required<FormControl<string>>();
  readonly inputId = input.required<string>();
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);

  protected readonly visible = signal(false);
}
