import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { DEMO_ACCOUNTS } from '../../../lib/constants';

/** Mock mode only: one-click fill for the seeded accounts from the docs. */
@Component({
  selector: 'app-demo-accounts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full max-w-auth rounded-lg border border-dashed border-brand-200 bg-brand-50 p-4' },
  template: `
    <h2 class="text-sm font-semibold text-brand-800">Demo mode: pick an account</h2>
    <p class="mt-0.5 text-xs text-ink-secondary">Data is mocked in your browser. Every password is Password123!</p>
    <ul class="mt-3 grid grid-cols-2 gap-2">
      @for (account of accounts; track account.email) {
        <li>
          <button
            type="button"
            class="w-full rounded-sm bg-surface px-3 py-2 text-left shadow-card transition-colors hover:bg-brand-100"
            (click)="pick.emit(account.email)"
          >
            <span class="block text-sm font-medium text-ink">{{ account.label }}</span>
            <span class="block truncate text-xs text-ink-meta">{{ account.note }}</span>
          </button>
        </li>
      }
    </ul>
  `,
})
export class DemoAccounts {
  readonly pick = output<string>();
  protected readonly accounts = DEMO_ACCOUNTS;
}
