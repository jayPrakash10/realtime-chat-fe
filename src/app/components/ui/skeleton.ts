import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Grey placeholder block. Size and shape come from the classes on the host: <app-skeleton class="h-4 w-32 rounded-sm" />. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block animate-pulse bg-skeleton', 'aria-hidden': 'true' },
  template: ``,
})
export class Skeleton {}
