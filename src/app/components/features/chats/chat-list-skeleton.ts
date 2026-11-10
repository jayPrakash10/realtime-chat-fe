import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Skeleton } from '../../ui/skeleton';

@Component({
  selector: 'app-chat-list-skeleton',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" aria-label="Loading chats">
      @for (row of rows; track row) {
        <div class="flex items-center gap-3 px-3 py-3">
          <app-skeleton class="size-12 rounded-full" />
          <div class="flex flex-1 flex-col gap-2">
            <app-skeleton class="h-4 w-2/5 rounded-sm" />
            <app-skeleton class="h-3 w-4/5 rounded-sm" />
          </div>
        </div>
      }
    </div>
  `,
})
export class ChatListSkeleton {
  protected readonly rows = [1, 2, 3, 4, 5, 6, 7];
}
