import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, type ToastKind } from '../../services/toast.service';
import { Icon, type IconName } from './icon';

const ICONS: Record<ToastKind, IconName> = { info: 'info', success: 'check', error: 'alert' };
const ICON_TONES: Record<ToastKind, string> = {
  info: 'text-brand-200',
  success: 'text-online',
  error: 'text-danger-400',
};

@Component({
  selector: 'app-toast-host',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      aria-label="Notifications"
      class="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4 md:top-auto md:bottom-6"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-pop"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
        >
          <app-icon [name]="icons[toast.kind]" [class]="tones[toast.kind]" />
          <p class="flex-1 pt-px">{{ toast.message }}</p>
          <button
            type="button"
            class="-m-1 rounded-full p-1 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss notification"
            (click)="toasts.dismiss(toast.id)"
          >
            <app-icon name="x" size="sm" />
          </button>
        </div>
      }
    </section>
  `,
})
export class ToastHost {
  protected readonly toasts = inject(ToastService);
  protected readonly icons = ICONS;
  protected readonly tones = ICON_TONES;
}
