import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Header of the left pane. Put leading controls in [paneStart] and actions in the default slot. */
@Component({
  selector: 'app-pane-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-15 shrink-0 items-center gap-2 border-b border-border bg-surface-muted px-3' },
  template: `
    <ng-content select="[paneStart]" />
    <h2 class="min-w-0 flex-1 truncate px-1 text-lg font-semibold text-ink">{{ title() }}</h2>
    <ng-content />
  `,
})
export class PaneHeader {
  readonly title = input.required<string>();
}
