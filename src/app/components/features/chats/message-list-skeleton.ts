import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Skeleton } from '../../ui/skeleton';

@Component({
  selector: 'app-message-list-skeleton',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'chat-wallpaper flex min-h-0 flex-1 flex-col justify-end gap-3 px-4 py-4 md:px-[6%]' },
  template: `
    <div role="status" aria-label="Loading messages" class="flex flex-col gap-3">
      @for (bubble of bubbles; track $index) {
        <app-skeleton class="h-10 rounded-md" [class]="bubble" />
      }
    </div>
  `,
})
export class MessageListSkeleton {
  protected readonly bubbles = ['w-1/2', 'w-1/3 self-end', 'w-2/5', 'w-3/5 self-end', 'w-1/4 self-end', 'w-1/2'];
}
