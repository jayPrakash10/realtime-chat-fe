import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Logo } from '../components/ui/logo';

const COPY = {
  chats: {
    title: 'Pick up where you left off',
    text: 'Select a chat on the left, or start a new one. Messages, read receipts and online status update live.',
  },
  search: {
    title: 'Find someone to chat with',
    text: 'Search by username or name, then pick a person to open your chat with them.',
  },
} as const;

/** Desktop main-pane placeholder for list-level routes (hidden on mobile, where the list fills the screen). */
@Component({
  selector: 'app-placeholder-page',
  imports: [Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col items-center justify-center gap-5 bg-surface-muted px-8 text-center' },
  template: `
    <app-logo size="lg" [showName]="false" />
    <h2 class="text-2xl font-semibold text-ink">{{ copy().title }}</h2>
    <p class="max-w-md text-sm text-ink-secondary">{{ copy().text }}</p>
  `,
})
export class PlaceholderPage {
  /** Bound from route data. */
  readonly placeholder = input<keyof typeof COPY>('chats');
  protected readonly copy = computed(() => COPY[this.placeholder()]);
}
