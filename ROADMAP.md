# Cloud SaaS Toolkit Roadmap

## Goal

Migrate the static tool pages into a unified frontend hosted on Cloudflare Pages,
with Supabase as the backend and Cloudflare Pages Functions as the API gateway.

## Current State

- Source restored into this repository from the original Netlify site.
- Git remotes:
  - `origin`: https://gitee.com/FynKatz/cloud-saas-toolkit.git
  - `github`: https://github.com/FynKatz/cloud-saas-toolkit.git
- Branch flow: `feature/2610 -> dev -> int -> stg -> prod`
- Supabase credentials are currently hardcoded in `js/supabase-config.js`.
- Protected page passwords are currently hardcoded in `js/auth-config.js`.

## Target Architecture

```text
Browser
  |-> Cloudflare Pages: static Vue/Vite frontend
  |-> Cloudflare Pages Functions: /api/*
          |-> Supabase Auth / Database API
```

This removes direct browser access to Supabase, keeps secrets in Cloudflare
environment variables, and lets the application work behind restrictive
corporate proxies that only allow Cloudflare traffic.

## Phases

### Phase 1: Cloudflare Pages Foundation

- Register a global Cloudflare account at https://www.cloudflare.com
- Connect the GitHub repository `FynKatz/cloud-saas-toolkit`
- Set the production branch to `prod`
- Deploy the current static files and verify pages load
- Keep the current Supabase direct connection for this initial milestone

### Phase 2: Frontend and API Migration

- Rebuild the frontend as a unified Vue + Vite application
- Standardize navigation, layout, components, and visual design
- Add Cloudflare Pages Functions under `/api/*`
- Proxy Supabase requests through Cloudflare instead of the browser
- Store Supabase keys in Cloudflare environment variables

### Phase 3: Authentication and Security

- Replace hardcoded passwords in `auth-config.js`
- Use Supabase Auth for login and session management
- Protect pages with route guards and Supabase sessions
- Apply Supabase Row Level Security policies for all protected data

### Phase 4: Tool Migration and Polish

- Migrate each existing tool page into the Vue app
- Standardize UI/UX across all tools
- Add automated tests and branch-based preview deployments
- Validate on desktop and mobile viewports

## Repository Rules

- `prod` is the only production deployment branch.
- Merge changes through:
  `feature/2610 -> dev -> int -> stg -> prod`
- Do not commit local secret files; rely on Cloudflare environment variables.
