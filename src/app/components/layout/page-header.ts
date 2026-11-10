import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconButton } from '../ui/icon-button';

/** Header of a main-pane page. The back link only shows on mobile, where the page is full screen. */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-15 shrink-0 items-center gap-2 border-b border-border bg-surface-muted px-2 md:px-6' },
  template: `
    @if (backLink()) {
      <a appIconButton [routerLink]="backLink()" icon="arrow-left" [label]="backLabel()" class="md:hidden"></a>
    }
    <ng-content select="[pageStart]" />
    <h1 class="min-w-0 flex-1 truncate px-1 text-lg font-semibold text-ink">{{ title() }}</h1>
    <ng-content />
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly backLink = input<string | null>(null);
  readonly backLabel = input('Back');
}
