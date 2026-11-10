# ChatNest Web

A WhatsApp-style direct-messaging frontend for the **ChatNest API** (Node.js, Express, MongoDB, Socket.IO).
It's built with **Angular 22** (standalone components, signals, zoneless), **Tailwind CSS 4** and **Axios**.

- Two-pane chat layout on desktop and single-pane screens on mobile
- Live messages, read receipts (✓ / ✓✓) and online/last-seen presence over Socket.IO
- Text and photo messages with upload progress, optimistic sending, and retry on failure
- Infinite scroll through message history (cursor pagination), a photo gallery and in-chat search
- Delete for me / delete for everyone (15-minute window), delete chat, block and unblock
- Admin panel to search, filter, ban and unban users
- **Mock mode**: the whole app runs in the browser with seeded data (MSW and a simulated socket). No backend needed.

## Quick start

Requires Node.js 22+.

```bash
npm install
cp .env.example .env          # then edit .env
npm start                     # http://localhost:4200
```

**No backend?** Set `NG_APP_USE_MOCKS=true` in `.env` and run `npm start`. The login page then offers one-click demo accounts.
Every password is `Password123!`. Try Aisha: she has an unread photo from Sara, and Sara "replies" when you message her.

## Scripts

| Script | What it does |
|---|---|
| `npm start` | Writes the environment file from `.env`, then runs the dev server |
| `npm run build` | Production build into `dist/chatnest` |
| `npm test` | Unit tests (Vitest) for formatters, message rules and the conversations store |
| `npm run env` | Only regenerates `src/environments/environment.ts` from `.env` |

## Environment variables

Angular has no built-in `.env` support, so `scripts/generate-env.mjs` runs before `start`, `build` and `test`.
It turns `.env` into `src/environments/environment.ts`, which is git-ignored. If there is no `.env`, it uses `.env.example`.
Shell variables with the same names take precedence, which is useful in CI.

| Variable | Example | Purpose |
|---|---|---|
| `NG_APP_API_BASE_URL` | `http://localhost:5000/api/v1` | REST base URL |
| `NG_APP_SERVER_ORIGIN` | `http://localhost:5000` | Origin for `/uploads/...` images and the Socket.IO connection |
| `NG_APP_USE_MOCKS` | `false` | `true` runs entirely in the browser with mock data |

No secrets belong here. Everything in the environment file ends up in the browser bundle.

## Connecting to the real API

1. Start the backend (`npm run seed` there gives you the demo accounts).
2. In `.env`, set `NG_APP_USE_MOCKS=false` and point both URLs at the backend.
3. Make sure the backend's `CORS_ORIGIN` allows `http://localhost:4200`, or leave it at `*`.
   Auth uses the `Authorization` header, not cookies, so no credentials setting is needed.
4. `npm start`, then log in as `aisha@example.com` / `Password123!`. Open a second browser profile as Sara to see live messages, ticks and presence.

## Deploying to Vercel

`vercel.json` already sets the build command (`npm run build`, so the environment file is generated),
the output folder (`dist/chatnest/browser`), a fallback to `index.html` for deep links such as `/chats/:id`,
and long-term caching for hashed files.

1. Import the repository in Vercel (or run `npx vercel` in this folder). Keep the root directory as the project root.
2. Under **Project Settings → Environment Variables**, set either:
   - `NG_APP_API_BASE_URL` and `NG_APP_SERVER_ORIGIN` pointing at your deployed backend, **or**
   - `NG_APP_USE_MOCKS=true` for a demo that needs no backend.

   The build stops with a clear message if neither is set, instead of shipping an app that points at `localhost`.
3. Redeploy after changing a variable. The values are baked in at build time.

The backend must be reachable over **https** (and `wss` for Socket.IO), or the browser blocks it as mixed content.
Its `CORS_ORIGIN` must allow your Vercel domain, for example `https://chatnest.vercel.app`.

## How it is organised

```
src/
├── app/
│   ├── api/            Axios client (token, envelope unwrapping, errors), one service per resource, typed models
│   ├── store/          Signal stores: auth, conversations, messages, presence, blocks
│   ├── services/       Socket connection and event routing, toasts, confirm dialog, breakpoints
│   ├── guards/         auth, guest and admin route guards
│   ├── lib/            Pure helpers: limits, formatters, message status rules, validators (unit-tested)
│   ├── components/
│   │   ├── ui/         Button, IconButton, Avatar, Badge, Chip, FormField, Dialog, Menu, Toast, Skeleton…
│   │   ├── layout/     App shell, nav rail, bottom nav, pane/page headers, auth layout
│   │   └── features/   auth, chats, users, settings, admin
│   ├── pages/          Thin route components
│   └── app.routes.ts
├── mocks/              In-memory DB seeded from the API docs, MSW handlers for all 20 endpoints, mock socket
└── styles.css          Design tokens (Tailwind @theme) and base styles
```

**Data flow:** components call stores, stores call the `*Api` services, and the services use `ApiClient` (Axios).
Socket events go `RealtimeService` → `RealtimeSyncService` → stores, so the UI updates the same way whether a change came from REST or from the socket.

**Error handling:** every request fails with an `ApiError` whose `message` is safe to show.
A 401 logs the user out. A 403 "Your account has been banned" logs them out and shows `/banned`.
Validation `details[]` are mapped onto form fields.

## Design system

The palette shifts WhatsApp's green to violet (`brand-600 #5B5BD6`) on cool neutral surfaces. Text is Inter Variable.
All colors, type sizes, radii, shadows and layout widths are tokens in `src/styles.css`.
Tailwind's default palette is removed, so off-system colors fail to compile into classes.
Text colors meet WCAG AA, and the read-tick blue meets the 3:1 contrast required for icons.

## Endpoint → screen coverage

| # | Endpoint | Used by |
|---|---|---|
| 1 | `POST /auth/register` | Register page |
| 2 | `POST /auth/login` | Login page |
| 3 | `GET /auth/me` | App start (session restore), re-check after the socket is dropped |
| 4 | `GET /users` | New chat → people search |
| 5 | `GET /users/:id` | Profile page, Contact info panel in a chat |
| 6 | `PATCH /users/me` | Settings → Profile (name, bio) |
| 7 | `PUT /users/me/avatar` | Settings → Profile (Change photo) |
| 8 | `GET /users/me/blocks` | Settings → Blocked users; block state on profiles and in chats |
| 9 | `POST /users/:id/block` | Profile, Contact info, chat menu → Block |
| 10 | `DELETE /users/:id/block` | Blocked users list, profile, chat menu, composer notice → Unblock |
| 11 | `POST /conversations` | Search result tap, profile → Message |
| 12 | `GET /conversations` | Chat list (All / Unread), unread badge in the navigation |
| 13 | `GET /conversations/:id` | Chat header; fetching a chat that a new message brings back |
| 14 | `PATCH /conversations/:id/read` | Opening a chat, incoming message in the open chat, tab regains focus |
| 15 | `DELETE /conversations/:id` | Chat menu → Delete chat |
| 16 | `GET /conversations/:id/messages` | Chat history (infinite scroll), Photos panel (`type=image`), Search panel (`q`) |
| 17 | `POST /conversations/:id/messages` | Composer (text), photo send sheet (image and caption) |
| 18 | `DELETE /messages/:id` | Message menu → Delete for me / Delete for everyone |
| 19 | `GET /admin/users` | Admin → Users (search, status filter, pages) |
| 20 | `PATCH /admin/users/:id/ban` | Admin → Users (Ban / Unban) |

Socket events `message:new`, `message:deleted`, `conversation:read`, `user:online` and `user:offline` are all handled in
`src/app/services/realtime-sync.service.ts`.

## Known limits (from the API)

- An in-chat search result can't jump to that message in the history, because the API has no "messages around X" query.
- Presence updates live only for people you share a chat with. Search results don't include online status.
- You only learn that someone blocked you when sending fails ("You can't message this user").
- The badge in the navigation counts chats with unread messages, not individual messages (there is no total-unread endpoint).
- Mock mode keeps data in memory for one tab. Seeded data comes back on reload, but anything you create is lost.
