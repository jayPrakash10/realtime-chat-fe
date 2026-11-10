import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon, type IconName } from './icon';
import { IconButton } from './icon-button';

export interface MenuItem {
  id: string;
  label: string;
  icon?: IconName;
  tone?: 'danger';
}

interface MenuPosition {
  top: number | null;
  bottom: number | null;
  left: number | null;
  right: number | null;
}

const MENU_WIDTH = 208;
const ITEM_HEIGHT = 40;
let nextMenuId = 0;

/**
 * Menu button (WAI-ARIA pattern): arrow keys move between items, Esc closes and returns focus.
 * The panel is position: fixed, so scrolling containers never clip it, and it opens upward near the bottom.
 */
@Component({
  selector: 'app-menu',
  imports: [Icon, IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <button
      #trigger
      appIconButton
      type="button"
      [icon]="icon()"
      [label]="label()"
      [size]="size()"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? menuId : null"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
    ></button>
    @if (open()) {
      <div
        #panel
        [id]="menuId"
        role="menu"
        [attr.aria-label]="label()"
        class="fixed z-40 min-w-52 rounded-lg bg-surface py-1.5 shadow-pop ring-1 ring-border"
        [style.top.px]="position().top"
        [style.bottom.px]="position().bottom"
        [style.left.px]="position().left"
        [style.right.px]="position().right"
        (keydown)="onMenuKeydown($event)"
      >
        @for (item of items(); track item.id) {
          <button
            type="button"
            role="menuitem"
            tabindex="-1"
            class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:-outline-offset-2"
            [class]="item.tone === 'danger' ? 'text-danger-600' : 'text-ink'"
            (click)="choose(item)"
          >
            @if (item.icon) {
              <app-icon [name]="item.icon" size="sm" />
            }
            {{ item.label }}
          </button>
        }
      </div>
    }
  `,
})
export class Menu {
  readonly items = input.required<readonly MenuItem[]>();
  readonly label = input.required<string>();
  readonly icon = input<IconName>('more');
  readonly size = input<'sm' | 'md'>('md');
  readonly align = input<'start' | 'end'>('end');
  readonly selected = output<string>();
  /** Fires right before opening, so the parent can refresh time-dependent items. */
  readonly opened = output<void>();

  protected readonly menuId = `menu-${++nextMenuId}`;
  protected readonly open = signal(false);
  protected readonly position = signal<MenuPosition>({ top: null, bottom: null, left: null, right: null });

  private readonly trigger = viewChild.required('trigger', { read: ElementRef });
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private removeListeners: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detach());
  }

  protected toggle(): void {
    if (this.open()) this.hide(true);
    else this.show('first');
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.show(event.key === 'ArrowDown' ? 'first' : 'last');
    }
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveFocus(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusItem(-1);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.hide(true);
        break;
      case 'Tab':
        this.hide(false);
        break;
    }
  }

  protected choose(item: MenuItem): void {
    this.hide(true);
    this.selected.emit(item.id);
  }

  private show(focus: 'first' | 'last'): void {
    this.opened.emit();
    const rect = (this.trigger().nativeElement as HTMLElement).getBoundingClientRect();
    const estimatedHeight = this.items().length * ITEM_HEIGHT + 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedHeight + 8 && rect.top > spaceBelow;
    const alignEnd = this.align() === 'end' ? rect.right - MENU_WIDTH >= 8 : rect.left + MENU_WIDTH > window.innerWidth - 8;
    this.position.set({
      top: openUp ? null : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : null,
      left: alignEnd ? null : Math.max(8, rect.left),
      right: alignEnd ? window.innerWidth - rect.right : null,
    });
    this.open.set(true);
    this.attach();
    afterNextRender(() => this.focusItem(focus === 'first' ? 0 : -1), { injector: this.injector });
  }

  private hide(returnFocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    this.detach();
    if (returnFocus) (this.trigger().nativeElement as HTMLElement).focus();
  }

  private menuItems(): HTMLElement[] {
    return Array.from(this.panel()?.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  }

  private focusItem(index: number): void {
    const items = this.menuItems();
    if (!items.length) return;
    items[(index + items.length) % items.length]?.focus();
  }

  private moveFocus(delta: number): void {
    const items = this.menuItems();
    const current = items.indexOf(document.activeElement as HTMLElement);
    this.focusItem(current === -1 ? 0 : current + delta);
  }

  private attach(): void {
    this.detach();
    const onPointerDown = (event: PointerEvent) => {
      if (!this.host.nativeElement.contains(event.target as Node)) this.hide(false);
    };
    const onScroll = (event: Event) => {
      if (!this.panel()?.nativeElement.contains(event.target as Node)) this.hide(false);
    };
    const onResize = () => this.hide(false);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    this.removeListeners = () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }

  private detach(): void {
    this.removeListeners?.();
    this.removeListeners = null;
  }
}
