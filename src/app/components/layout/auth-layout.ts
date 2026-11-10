import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Logo } from '../ui/logo';

/** Centered card used by login, register and the banned notice. */
@Component({
  selector: 'app-auth-layout',
  imports: [Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10' },
  template: `
    <app-logo size="lg" />
    <main class="w-full max-w-auth rounded-lg bg-surface p-6 shadow-card sm:p-8">
      <h1 class="text-2xl font-semibold text-ink">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="mt-1 text-sm text-ink-secondary">{{ subtitle() }}</p>
      }
      <div class="mt-6">
        <ng-content />
      </div>
    </main>
    <ng-content select="[authFooter]" />
  `,
})
export class AuthLayout {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
