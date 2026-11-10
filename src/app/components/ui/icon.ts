import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Stroke icons drawn on a 24×24 grid. Each entry is a list of SVG path commands. */
const ICONS = {
  'alert': ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'M12 8v4', 'M12 16h.01'],
  'arrow-down': ['M12 5v14', 'm19 12-7 7-7-7'],
  'arrow-left': ['M19 12H5', 'm12 19-7-7 7-7'],
  'ban': ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'm4.9 4.9 14.2 14.2'],
  'camera': [
    'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z',
    'M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  ],
  'chat': ['M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12Z'],
  'check': ['M20 6 9 17l-5-5'],
  'check-double': ['M18 6 7 17l-5-5', 'm22 10-7.5 7.5L13 16'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-left': ['m15 18-6-6 6-6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'clock': ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'M12 6v6l4 2'],
  'edit': ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  'eye': ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
  'eye-off': [
    'M10.7 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2',
    'M6.6 6.6A16 16 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6',
    'M9.9 9.9a3 3 0 0 0 4.2 4.2',
    'm2 2 20 20',
  ],
  'image': [
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
    'M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
    'm21 15-5-5L5 21',
  ],
  'info': ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'M12 16v-4', 'M12 8h.01'],
  'lock': ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  'logout': ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  'more': [
    'M12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
    'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
    'M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  ],
  'paperclip': ['m21.4 11-8.8 8.8a5.5 5.5 0 0 1-7.8-7.8l8.8-8.8a3.7 3.7 0 0 1 5.2 5.2l-8.8 8.8a1.8 1.8 0 0 1-2.6-2.6l8.1-8.1'],
  'refresh': ['M3 12a9 9 0 0 1 15.5-6.3L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15.5 6.3L3 16', 'M3 21v-5h5'],
  'search': ['M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z', 'm20 20-4-4'],
  'send': ['M22 2 11 13', 'M22 2l-7 20-4-9-9-4Z'],
  'settings': ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M2 14h4', 'M10 8h4', 'M18 16h4'],
  'shield': ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'],
  'trash': ['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'],
  'unlock': ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z', 'M7 11V7a5 5 0 0 1 9.9-1'],
  'user': ['M20 21a8 8 0 0 0-16 0', 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
  'users': [
    'M16 21a6 6 0 0 0-12 0',
    'M14 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    'M22 21a6 6 0 0 0-4-5.7',
    'M16 4.1a4 4 0 0 1 0 7.8',
  ],
  'x': ['M18 6 6 18', 'm6 6 12 12'],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;
export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<IconSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-8',
};

/** Decorative icon. Always aria-hidden: the surrounding control provides the accessible name. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.stroke-width]="strokeWidth()"
      aria-hidden="true"
      focusable="false"
      class="size-full"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<IconSize>('md');
  readonly strokeWidth = input(2);

  protected readonly paths = computed(() => ICONS[this.name()]);
  protected readonly hostClass = computed(() => `inline-block shrink-0 ${SIZE_CLASSES[this.size()]}`);
}
