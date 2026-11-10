import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { ApiError } from '../api/api-error';
import type { PageMeta, User } from '../api/types';
import { AdminUserCard } from '../components/features/admin/admin-user-card';
import { AdminUsersTable } from '../components/features/admin/admin-users-table';
import { PageHeader } from '../components/layout/page-header';
import { Chip } from '../components/ui/chip';
import { EmptyState } from '../components/ui/empty-state';
import { ErrorState } from '../components/ui/error-state';
import { Icon } from '../components/ui/icon';
import { Paginator } from '../components/ui/paginator';
import { Skeleton } from '../components/ui/skeleton';
import { LIMITS, SEARCH_DEBOUNCE_MS } from '../lib/constants';
import { ConfirmService } from '../services/confirm.service';
import { ToastService } from '../services/toast.service';
import { AuthStore } from '../store/auth.store';

type StatusFilter = 'all' | 'active' | 'banned';

interface AdminQuery {
  search: string;
  status: StatusFilter;
  page: number;
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
];

/** /admin/users: GET /admin/users with search, ban-status filter and pages, all kept in the URL. */
@Component({
  selector: 'app-admin-users-page',
  imports: [PageHeader, Chip, EmptyState, ErrorState, Icon, Paginator, Skeleton, AdminUsersTable, AdminUserCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <app-page-header title="Users" backLink="/chats" backLabel="Back to chats" />
    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8">
        <p class="text-sm text-ink-secondary">Search accounts and ban or unban users. A ban signs the user out immediately.</p>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="relative w-full sm:max-w-xs">
            <label for="admin-search" class="sr-only">Search by username or email</label>
            <app-icon name="search" size="sm" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-meta" />
            <input
              id="admin-search"
              type="search"
              class="input pl-9"
              placeholder="Search username or email"
              autocomplete="off"
              [maxLength]="maxSearch"
              [value]="searchInput()"
              (input)="onSearchInput($event)"
            />
          </div>
          <div class="flex gap-2" role="group" aria-label="Filter by status">
            @for (filter of statusFilters; track filter.value) {
              <button appChip [selected]="query().status === filter.value" (click)="setStatus(filter.value)">
                {{ filter.label }}
              </button>
            }
          </div>
        </div>

        @if (status() === 'loading' && !users().length) {
          <div class="flex flex-col gap-2" role="status" aria-label="Loading users">
            @for (row of placeholders; track row) {
              <app-skeleton class="h-14 rounded-lg" />
            }
          </div>
        } @else if (status() === 'error') {
          <app-error-state title="Couldn't load users" [message]="error()!" (retry)="load(query())" />
        } @else if (!users().length) {
          <app-empty-state icon="users" title="No users found" description="Try a different search or filter." />
        } @else {
          <div [class.opacity-60]="status() === 'loading'" [attr.aria-busy]="status() === 'loading'">
            <app-admin-users-table
              class="hidden md:block"
              [users]="users()"
              [meId]="meId()"
              [busyId]="busyId()"
              (toggleBan)="toggleBan($event)"
            />
            <ul class="flex flex-col gap-3 md:hidden" aria-label="Users">
              @for (user of users(); track user._id) {
                <li>
                  <app-admin-user-card
                    [user]="user"
                    [isSelf]="user._id === meId()"
                    [busy]="busyId() === user._id"
                    (toggleBan)="toggleBan($event)"
                  />
                </li>
              }
            </ul>
          </div>
          @if (meta(); as m) {
            <app-paginator [page]="m.page" [totalPages]="m.totalPages" [total]="m.total" [limit]="m.limit" (pageChange)="setPage($event)" />
          }
        }
      </div>
    </div>
  `,
})
export class AdminUsersPage {
  private readonly api = inject(AdminApi);
  private readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly maxSearch = LIMITS.searchMax;
  protected readonly placeholders = [1, 2, 3, 4, 5];
  protected readonly meId = computed(() => this.auth.me()?._id ?? null);

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly query = computed<AdminQuery>(() => {
    const params = this.params();
    const status = params.get('status');
    const page = Number(params.get('page'));
    return {
      search: (params.get('search') ?? '').trim().slice(0, LIMITS.searchMax),
      status: status === 'active' || status === 'banned' ? status : 'all',
      page: Number.isInteger(page) && page >= 1 ? page : 1,
    };
  });
  /** Text box value; follows the URL (back/forward) and is debounced into it while typing. */
  protected readonly searchInput = linkedSignal(() => this.query().search);

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly users = signal<User[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly busyId = signal<string | null>(null);
  private seq = 0;

  constructor() {
    effect(() => {
      const query = this.query();
      untracked(() => void this.load(query));
    });
    toObservable(this.searchInput)
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((search) => {
        if (search !== this.query().search) this.navigate({ search: search || null, page: null }, true);
      });
  }

  protected onSearchInput(event: Event): void {
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  protected setStatus(status: StatusFilter): void {
    this.navigate({ status: status === 'all' ? null : status, page: null });
  }

  protected setPage(page: number): void {
    this.navigate({ page: page > 1 ? page : null });
  }

  protected async load(query: AdminQuery): Promise<void> {
    const seq = ++this.seq;
    this.status.set('loading');
    try {
      const result = await this.api.listUsers({
        search: query.search || undefined,
        isBanned: query.status === 'all' ? undefined : query.status === 'banned',
        page: query.page,
        limit: LIMITS.pageLimit,
      });
      if (seq !== this.seq) return;
      if (result.meta.totalPages > 0 && query.page > result.meta.totalPages) {
        this.setPage(result.meta.totalPages);
        return;
      }
      this.users.set(result.items);
      this.meta.set(result.meta);
      this.status.set('ready');
    } catch (error) {
      if (seq !== this.seq) return;
      this.error.set(ApiError.from(error).message);
      this.status.set('error');
    }
  }

  protected async toggleBan(user: User): Promise<void> {
    const banning = !user.isBanned;
    const confirmed = await this.confirm.ask(
      banning
        ? {
            title: `Ban ${user.name}?`,
            message: `${user.name} will be signed out right away and won't be able to use ChatNest until unbanned.`,
            confirmLabel: 'Ban user',
            tone: 'danger',
          }
        : {
            title: `Unban ${user.name}?`,
            message: `${user.name} will be able to log in and message people again.`,
            confirmLabel: 'Unban user',
          },
    );
    if (!confirmed) return;
    this.busyId.set(user._id);
    try {
      const updated = await this.api.setBan(user._id, banning);
      this.users.update((users) => users.map((existing) => (existing._id === updated._id ? updated : existing)));
      this.toast.success(banning ? `${updated.name} is banned.` : `${updated.name} is unbanned.`);
    } catch (error) {
      this.toast.error(ApiError.from(error).message);
    } finally {
      this.busyId.set(null);
    }
  }

  private navigate(params: Record<string, string | number | null>, replaceUrl = false): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl });
  }
}
