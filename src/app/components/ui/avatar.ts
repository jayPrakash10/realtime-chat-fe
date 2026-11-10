import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { initials } from '../../lib/formatters';
import { MediaUrlPipe } from '../../lib/media-url';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const BOX: Record<AvatarSize, string> = {
  xs: 'size-8 text-xs',
  sm: 'size-10 text-sm',
  md: 'size-12 text-base',
  lg: 'size-20 text-xl',
  xl: 'size-32 text-2xl',
};

const DOT: Record<AvatarSize, string> = {
  xs: 'size-2.5',
  sm: 'size-3',
  md: 'size-3.5',
  lg: 'size-4',
  xl: 'size-5',
};

const TONES = [
  'bg-avatar-1 text-avatar-1-ink',
  'bg-avatar-2 text-avatar-2-ink',
  'bg-avatar-3 text-avatar-3-ink',
  'bg-avatar-4 text-avatar-4-ink',
  'bg-avatar-5 text-avatar-5-ink',
];

/**
 * Profile picture with an initials fallback (when there is no avatarUrl or it fails to load)
 * and an optional online dot. Decorative by default; pass `alt` when the avatar stands alone.
 */
@Component({
  selector: 'app-avatar',
  imports: [MediaUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-flex shrink-0' },
  template: `
    <span class="inline-flex overflow-hidden rounded-full" [class]="box()">
      @if (src() && !failed()) {
        <img
          [src]="src() | mediaUrl"
          [alt]="alt()"
          class="size-full object-cover"
          loading="lazy"
          (error)="failed.set(true)"
        />
      } @else {
        <span
          class="flex size-full items-center justify-center font-semibold"
          [class]="tone()"
          [attr.role]="alt() ? 'img' : null"
          [attr.aria-label]="alt() || null"
          [attr.aria-hidden]="alt() ? null : 'true'"
        >
          {{ letters() }}
        </span>
      }
    </span>
    @if (online()) {
      <span class="absolute right-0 bottom-0 rounded-full bg-online ring-2 ring-surface" [class]="dot()">
        <span class="sr-only">Online</span>
      </span>
    }
  `,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly src = input<string | null>(null);
  readonly size = input<AvatarSize>('md');
  readonly online = input(false);
  readonly alt = input('');

  /** Resets whenever the image URL changes. */
  protected readonly failed = linkedSignal({ source: this.src, computation: () => false });
  protected readonly letters = computed(() => initials(this.name()));
  protected readonly box = computed(() => BOX[this.size()]);
  protected readonly dot = computed(() => DOT[this.size()]);
  protected readonly tone = computed(() => {
    let hash = 0;
    for (const char of this.name()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return TONES[hash % TONES.length];
  });
}
