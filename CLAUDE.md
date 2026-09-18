# Marketplace — Frontend

Static HTML/CSS/SCSS/vanilla-JS frontend for Marketplace (diecast/collectibles
marketplace). No framework, no client-side build beyond SASS → CSS. Site content lives in
`diecast-models.netlify.app/` (folder name is a historical leftover from the original host —
see Deployment below). Backend is a separate repo (`marketplace-backend-starter`, Node/Express +
Supabase, deployed on Railway).

## Build

```
npm run build:css     # compiles sass/main.scss -> diecast-models.netlify.app/Styles/main.compiled.css
npm run watch:css      # same, in watch mode
```

There is no other build step. Compiled CSS is committed to the repo (not generated at request
time by the host), so `build:css` must be run and the result committed before pushing any SCSS
change.

## Deployment

**Active host: Cloudflare Pages.**

- Project name: `collectors-market`
- Live URL: **https://collectors-market.pages.dev**

  ⚠️ **Not yet renamed.** The Cloudflare Pages project itself is still called `collectors-market`
  (old client branding) — this doc reflects that actual, current name, it hasn't been left
  un-rebranded by mistake. If the Cloudflare project is renamed, update the project name, live
  URL, and the two API/dashboard references below to match — not guessed here, since the new
  slug isn't decided yet.
- Connected via GitHub integration to this repo (`KingHarrison1999/Portfolio`), branch `main`
- Cloudflare account ID: `b2d08bce33c8d391a114f7297ee2575e`
- Build command: `npm run build:css`
- Output/publish directory: `diecast-models.netlify.app` (copied directly from this repo's
  `netlify.toml`, which still holds the canonical build config even though Netlify is no longer
  the active host — see below)

**Auto-deploy-on-push is deliberately disabled** for this project
(`deployments_enabled: false` and `production_deployments_enabled: false` on the Cloudflare
Pages project config) to avoid burning deploys automatically. The git connection is still live —
disabling auto-deploy only stops it from triggering *by itself* on a push.

**A push to `main` does NOT go live by itself.** After pushing, a deploy has to be triggered manually, either:

- **API**: `POST https://api.cloudflare.com/client/v4/accounts/b2d08bce33c8d391a114f7297ee2575e/pages/projects/collectors-market/deployments`
  with a Cloudflare API token/OAuth token scoped to `Pages:Edit` as the Bearer token. This always
  builds+deploys whatever is currently the latest commit on `main`. (Cloudflare logs this as an
  `"ad_hoc"` trigger, distinct from a `"push"` trigger.)
- **Dashboard**: Cloudflare dashboard → Workers & Pages → `collectors-market` → Deployments tab →
  manual "Create deployment" / "Retry deployment".

If Cloudflare CLI/API access isn't already authenticated in whatever environment is doing the
deploy, that's a one-time `wrangler login` (or a supplied `CLOUDFLARE_API_TOKEN`) needed first —
same pattern as the `gh`/`railway`/`supabase` CLI logins this project already depends on.

### Legacy: Netlify (retired, not deleted)

Netlify was the original host and is being retired in favor of Cloudflare Pages (Netlify's
free-tier deploy credits ran out mid-cycle). **It has been left untouched** — not deleted, not
reconfigured — it's just no longer the active deploy target; don't assume it reflects the current
`main` branch.

Known Netlify site: `diecast-marketplace.netlify.app` — this was the real production Netlify
site (confirmed by logging into app.netlify.com directly: deploy history matches this repo's
actual work). It sits behind Netlify's Edge Access (account-login gate, HTTP 401 to anonymous
requests, real `site_id` `772012cd-2c04-47a8-9652-d901d522401d`), so it won't load for a logged-out
visitor or a plain HTTP request — that's expected, not a sign anything is broken.

**Resolved discrepancy:** during the Cloudflare Pages migration, a second, unrelated Netlify site
was also found live at `diecast-models.netlify.app` (matching this repo's own folder name). That
one is confirmed stale — a leftover pre-rebrand "Design Chooser" placeholder page with no
connection to this project's real content or deploy history. **Cloudflare Pages
(collectors-market.pages.dev — see the rename flag under Deployment above) remains the only host
serving current, real content going forward.**
