# Notchvid

Paste a YouTube link, watch it side-by-side with a markdown editor, and build a searchable library of timestamped takeaways.

<!-- TODO: hero screenshot — landing page + a video session side by side -->
![Notchvid](docs/screenshots/hero.png)

## Features

- **Side-by-side player + notes.** YouTube IFrame player on one side, a ProseMirror markdown editor on the other.
- **Slash commands for timestamps.** Type `/time` to insert the current playback time, `/unclear` to flag a confusing passage, or `/shadow` to mark a line worth shadowing.
- **Click to seek.** Click any timestamp block in your notes to jump the player there.
- **Playback controls.** Play / pause, step back-and-forth, change speed (0.5×–2×), and set an A–B loop with the slider.
- **Scroll to current time.** Jump the notes view to the block matching the current playback position.
- **Todo / doing / done workflow.** Track what you still need to revisit per video.
- **Unsaved-edit recovery.** Side-by-side diff when restoring an unsaved draft.
- **Google sign-in.** Powered by `better-auth`.

<!-- TODO: screenshot — editor with a /time block highlighted -->
![Slash commands](docs/screenshots/slash-commands.png)

<!-- TODO: screenshot — playback controls and A–B loop slider -->
![Playback controls](docs/screenshots/player-controls.png)

## Tech stack

- [SvelteKit 2](https://svelte.dev/) + Svelte 5 (runes)
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn-svelte](https://shadcn-svelte.com/) / [bits-ui](https://bits-ui.com/)
- [ProseMirror](https://prosemirror.net/) for the markdown editor
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [better-auth](https://www.better-auth.com/) with Google OAuth
- [Drizzle ORM](https://orm.drizzle.team/) + [Neon](https://neon.tech/) serverless Postgres
- [Cloudflare Pages](https://pages.cloudflare.com/) (deploys via `wrangler`)

## Getting started

This repo uses [bun](https://bun.sh/) as the package manager.

```sh
bun install
```

Create a `.env` with:

```sh
DATABASE_URL=postgres://...        # Neon connection string
BETTER_AUTH_SECRET=...              # 32+ char random string
BETTER_AUTH_URL=http://localhost:5173
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Push the schema and start the dev server:

```sh
bun run db:push
bun run dev
```

### Useful scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Start the SvelteKit dev server |
| `bun run build` | Production build |
| `bun run check` | `svelte-check` type check |
| `bun run db:push` | Push Drizzle schema to the database |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run cf:dev` | Build and run locally via `wrangler pages dev` |
| `bun run cf:deploy` | Build and deploy to Cloudflare Pages |
| `bun run cf:tail` | Tail Cloudflare Pages deployment logs |

## Deploying

The project targets Cloudflare Pages via `@sveltejs/adapter-cloudflare`.

```sh
bun run cf:deploy
```

Set the same env vars as above in the Cloudflare Pages project settings.
