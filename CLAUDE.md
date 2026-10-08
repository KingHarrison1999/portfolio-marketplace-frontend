# Marketplace — Frontend

Static HTML/CSS/SCSS/vanilla-JS frontend for a generic marketplace demo. No framework, no
client-side build beyond SASS → CSS. Site content lives in `site/`. Backend is a separate repo
(`marketplace-backend`, Node/Express + Supabase, deployed on Railway).

## Build

```
npm run build:css     # compiles sass/main.scss -> site/Styles/main.compiled.css
npm run watch:css      # same, in watch mode
```

There is no other build step. Compiled CSS is committed to the repo (not generated at request
time by the host), so `build:css` must be run and the result committed before pushing any SCSS
change.

## Deployment

**Active host: Cloudflare Workers (static assets).**

- Worker name: `portfolio-marketplace-frontend`
- Live URL: **https://portfolio-marketplace-frontend.kingharrison1999.workers.dev** — this is the
  real, deployed host, and the only one the backend accepts: Railway's `FRONTEND_URL` is set to
  it, which drives both the backend's CORS allow-list and Stripe's `success_url`/`cancel_url`.
- Cloudflare account ID: `b2d08bce33c8d391a114f7297ee2575e`
- Build command: `npm run build:css` (compiled CSS is committed anyway, see Build above)
- Published directory: `site` (same as `netlify.toml`, which still holds the canonical build
  config even though Netlify is no longer the active host — see below)

**Deploys are manual, via `wrangler` from a local machine** — there is no git integration, so
**a push to `main` does NOT go live by itself.** Check what's live with:

```
wrangler deployments list --name portfolio-marketplace-frontend
```

⚠️ The exact deploy command/config isn't recorded in this repo (there's no `wrangler.toml` /
`wrangler.jsonc` checked in). Before the next deploy, confirm the command that was used and add it
here (or commit a wrangler config) rather than guessing.

If `wrangler` isn't already authenticated in whatever environment is doing the deploy, that's a
one-time `wrangler login` (or a supplied `CLOUDFLARE_API_TOKEN`) first — same pattern as the
`gh`/`railway`/`supabase` CLI logins this project already depends on.

**Do not deploy to, link to, or reference any Cloudflare Pages project for this site.** An older
Pages deployment exists from before the move to Workers; it's stale (pre-Stripe), blocked by the
backend's CORS, and named after the original client project — that client's name must never
appear anywhere in this portfolio demo, including docs and test URLs.

### Legacy: Netlify (retired, not deleted)

Netlify was the original host and is being retired in favor of Cloudflare Workers (Netlify's
free-tier deploy credits ran out mid-cycle). **It has been left untouched** — not deleted, not
reconfigured — it's just no longer the active deploy target; don't assume it reflects the current
`main` branch.

Known Netlify site: the original production Netlify deployment (hostname omitted here — it
carries old client-era branding) — confirmed by logging into app.netlify.com directly: deploy
history matches this repo's actual work. It sits behind Netlify's Edge Access (account-login
gate, HTTP 401 to anonymous requests, real `site_id` `772012cd-2c04-47a8-9652-d901d522401d`), so
it won't load for a logged-out visitor or a plain HTTP request — that's expected, not a sign
anything is broken.

**Resolved discrepancy:** during the move off Netlify, a second, unrelated Netlify site
was also found live too, serving a stale, leftover pre-rebrand "Design Chooser" placeholder page
(it happened to share this repo's folder name at the time, before that folder was renamed away
from old client-era branding) with no connection to this project's real content or deploy
history. **The Cloudflare Worker above
(portfolio-marketplace-frontend.kingharrison1999.workers.dev) is the only host serving current,
real content going forward.**
