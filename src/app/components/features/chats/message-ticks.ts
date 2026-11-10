import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { MessageStatus } from '../../../api/types';
import { Icon, type IconName } from '../../ui/icon';

export type TickStatus = MessageStatus | 'sending' | 'failed';

const TICKS: Record<TickStatus, { icon: IconName; tone: string; label: string }> = {
  sending: { icon: 'clock', tone: 'text-ink-meta', label: 'Sending' },
  sent: { icon: 'check', tone: 'text-ink-meta', label: 'Sent' },
  read: { icon: 'check-double', tone: 'text-tick-read', label: 'Read' },
  failed: { icon: 'alert', tone: 'text-danger-600', label: 'Not sent' },
};

/** ✓ sent, ✓✓ read, a clock while sending, ! on failure. The state is announced, not just colored. */
@Component({
  selector: 'app-message-ticks',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex', role: 'img', '[attr.aria-label]': 'tick().label' },
  template: `<app-icon [name]="tick().icon" size="sm" [class]="tick().tone" [strokeWidth]="2.25" />`,
})
export class MessageTicks {
  readonly status = input.required<TickStatus>();
  protected readonly tick = computed(() => TICKS[this.status()]);
}
