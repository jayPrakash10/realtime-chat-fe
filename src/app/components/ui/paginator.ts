import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from './icon';

const WINDOW = 5;

/** Numbered pagination for page-based lists (admin users). */
@Component({
  selector: 'app-paginator',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center justify-between gap-3 sm:flex-row' },
  template: `
    <p class="text-sm text-ink-secondary" aria-live="polite">{{ rangeLabel() }}</p>
    @if (totalPages() > 1) {
      <nav aria-label="Pagination">
        <ul class="flex items-center gap-1">
          <li>
            <button
              type="button"
              class="flex size-9 items-center justify-center rounded-sm text-ink-secondary hover:bg-surface-muted disabled:opacity-40"
              [disabled]="page() <= 1"
              aria-label="Previous page"
              (click)="pageChange.emit(page() - 1)"
            >
              <app-icon name="chevron-left" size="sm" />
            </button>
          </li>
          @for (number of pages(); track number) {
            <li>
              <button
                type="button"
                class="flex size-9 items-center justify-center rounded-sm text-sm font-medium"
                [class]="number === page() ? 'bg-brand-600 text-white' : 'text-ink hover:bg-surface-muted'"
                [attr.aria-current]="number === page() ? 'page' : null"
                [attr.aria-label]="'Page ' + number"
                (click)="pageChange.emit(number)"
              >
                {{ number }}
              </button>
            </li>
          }
          <li>
            <button
              type="button"
              class="flex size-9 items-center justify-center rounded-sm text-ink-secondary hover:bg-surface-muted disabled:opacity-40"
              [disabled]="page() >= totalPages()"
              aria-label="Next page"
              (click)="pageChange.emit(page() + 1)"
            >
              <app-icon name="chevron-right" size="sm" />
            </button>
          </li>
        </ul>
      </nav>
    }
  `,
})
export class Paginator {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly total = input.required<number>();
  readonly limit = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly pages = computed(() => {
    const total = this.totalPages();
    const start = Math.max(1, Math.min(this.page() - Math.floor(WINDOW / 2), total - WINDOW + 1));
    const end = Math.min(total, start + WINDOW - 1);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  });

  protected readonly rangeLabel = computed(() => {
    const total = this.total();
    if (total === 0) return 'No results';
    const from = (this.page() - 1) * this.limit() + 1;
    const to = Math.min(total, this.page() * this.limit());
    return `Showing ${from}–${to} of ${total}`;
  });
}
