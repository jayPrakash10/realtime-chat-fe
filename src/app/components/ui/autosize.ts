import { Directive, ElementRef, afterRenderEffect, inject, input } from '@angular/core';

/** Grows a textarea with its content up to `maxHeight`, then scrolls. Pass the current value to re-measure. */
@Directive({ selector: 'textarea[appAutosize]' })
export class Autosize {
  readonly value = input('', { alias: 'appAutosize' });
  readonly maxHeight = input(144);

  constructor() {
    const element = inject<ElementRef<HTMLTextAreaElement>>(ElementRef).nativeElement;
    afterRenderEffect(() => {
      this.value();
      const max = this.maxHeight();
      element.style.height = 'auto';
      element.style.height = `${Math.min(element.scrollHeight, max)}px`;
      element.style.overflowY = element.scrollHeight > max ? 'auto' : 'hidden';
    });
  }
}
