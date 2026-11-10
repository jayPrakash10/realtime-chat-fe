import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileView } from '../components/features/users/profile-view';
import { PageHeader } from '../components/layout/page-header';
import { IconButton } from '../components/ui/icon-button';

@Component({
  selector: 'app-user-profile-page',
  imports: [PageHeader, ProfileView, IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <app-page-header title="Profile">
      <button pageStart appIconButton type="button" icon="arrow-left" label="Back" class="md:hidden" (click)="back()"></button>
    </app-page-header>
    <div class="min-h-0 flex-1 overflow-y-auto">
      <app-profile-view [userId]="userId()" />
    </div>
  `,
})
export class UserProfilePage {
  /** Bound from the :userId route parameter. */
  readonly userId = input.required<string>();

  private readonly location = inject(Location);
  private readonly router = inject(Router);

  /** Profiles are reached from search, chats and the blocked list, so go back in history when possible. */
  protected back(): void {
    const state = this.location.getState() as { navigationId?: number } | null;
    if ((state?.navigationId ?? 1) > 1) this.location.back();
    else void this.router.navigateByUrl('/chats');
  }
}
