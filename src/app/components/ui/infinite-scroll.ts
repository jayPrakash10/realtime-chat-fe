import { DestroyRef, Directive, ElementRef, afterNextRender, effect, inject, input, output } from '@angular/core';

/**
 * Emits `reached` when the host element scrolls into view inside `appInfiniteScrollRoot`.
 * When it is re-enabled (a page finished loading) it observes again, so a sentinel that is
 * still visible keeps loading until the container is full.
 */
@Directive({ selector: '[appInfiniteScroll]' })
export class InfiniteScroll {
  readonly reached = output<void>();
  readonly disabled = input(false, { alias: 'appInfiniteScrollDisabled' });
  readonly root = input<HTMLElement | null>(null, { alias: 'appInfiniteScrollRoot' });

  private observer: IntersectionObserver | null = null;

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    afterNextRender(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (!this.disabled() && entries.some((entry) => entry.isIntersecting)) this.reached.emit();
        },
        { root: this.root(), rootMargin: '150px 0px' },
      );
      this.observer.observe(element);
    });

    effect(() => {
      if (this.disabled() || !this.observer) return;
      this.observer.unobserve(element);
      this.observer.observe(element);
    });

    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
  }
}
