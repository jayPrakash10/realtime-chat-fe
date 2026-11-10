import { Injectable, signal } from '@angular/core';

/** Media-query state as signals. 768px matches Tailwind's `md`, where the two-pane layout starts. */
@Injectable({ providedIn: 'root' })
export class BreakpointService {
  private readonly desktop = this.watch('(min-width: 768px)');
  private readonly touch = this.watch('(hover: none)');

  readonly isDesktop = this.desktop.asReadonly();
  /** Touch-first devices: Enter adds a new line instead of sending, and hover-only controls stay visible. */
  readonly isTouch = this.touch.asReadonly();

  private watch(query: string) {
    const list = matchMedia(query);
    const state = signal(list.matches);
    list.addEventListener('change', (event) => state.set(event.matches));
    return state;
  }
}
