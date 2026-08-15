# Deploying to Hostinger

Live at **https://lime-boar-741438.hostingersite.com**.

The UI and the API ship as **one** Node app. Next.js serves the Angular build
out of `public/` and its own route handlers under `/api`, so both answer on the
same origin. That is what keeps the login cookie working with no CORS setup:
the browser never makes a cross-origin request, so nothing has to be allowed.

Requires a plan with the **Node.js** section in hPanel — Business or Cloud. On
Single/Premium there is no Node runtime and only the static half could be
hosted; see [If the plan has no Node.js](#if-the-plan-has-no-nodejs).

## Build

The Angular project lives in `frontend/` in this repo, but it is **not** built on
the server — the deployment runs only `next build` and has no Angular toolchain.
So `public/` is built locally, committed, and uploaded as-is.

```bash
npm run ui:install   # once, to install frontend/ dependencies
npm run ui:build     # builds the frontend, then copies it into public/
npm run build        # next build
```

`npm run ui:build` is the two steps together. To rebuild only the copy after
building Angular yourself, `npm run ui`.

Note that `npm install` at the root does **not** reach `frontend/` — it is a
nested project, not an npm workspace. Run `npm run ui:install` after cloning.

Check `public/index.html` exists before deploying — that file is the app.

## Deploy

In hPanel → your site → **Deployments**, either connect the Git repo or upload a
`.zip`. Next.js is auto-detected; if it asks, the framework is **Next.js** and
the output directory is `.next`.

`public/` must be included in what you upload. It is build output, but the
server cannot regenerate it — the deploy never runs the Angular build.

Do the environment variables first. A deploy that starts without `DATABASE_URL`
comes up and then fails every request, which reads like a broken build rather
than missing config.

## Environment variables

Set these **before** the first deploy. With none of them the app boots without a
database and every request fails.

`.env.production` in the project root holds the six values ready to go. In
hPanel → **Environment variables** → **Import .env**, upload that file and all
six land at once.

| Key | Value |
| --- | --- |
| `DATABASE_URL` | `mysql://USER:PASSWORD@srv1001.hstgr.io:3306/DATABASE` |
| `JWT_SECRET` | a long random string — **not** the development one |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://lime-boar-741438.hostingersite.com` |
| `SCHOOL_NAME` | the school's name, used on receipts |
| `SCHOOL_ADDRESS` | the school's address, used on receipts |

`.env.production` carries live credentials, so it is gitignored and belongs
nowhere but your machine and that upload box. To rotate the signing key — which
signs every user out, by design — generate a fresh one and re-import:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

`NODE_ENV=production` is what puts the `Secure` flag on the session cookie, so
it is only ever sent over HTTPS. Set it or the session is sent in the clear.

`FRONTEND_URL` only feeds the CORS headers in `middleware.ts`. Same-origin
requests never consult them, so it is belt-and-braces here — but set it
correctly anyway, so nothing else is accidentally allowed in.

## Database

The schema lives in migrations, and they are not applied automatically. Against
the production database, once per schema change:

```bash
npx prisma migrate deploy
```

`migrate deploy` rather than `migrate dev`, because shared hosting denies the
shadow database `migrate dev` needs. Run it from a machine that can reach the
database — the connection string is the same one the app uses.

Do **not** run `npm run prisma:seed` against production. It deletes the fees and
attendance of every seeded student and replaces them with demo data.

## Checks after deploying

```bash
curl -I  https://lime-boar-741438.hostingersite.com/login        # 200, text/html
curl -sI https://lime-boar-741438.hostingersite.com/api/auth/me  # 401, JSON
```

`/login` returning HTML means the SPA fallback is wired up. `/api/auth/me`
returning a JSON 401 rather than HTML means the API is live and the catch-all is
in place. Then sign in through the browser and confirm the dashboard loads —
that exercises the cookie round-trip, which curl alone does not prove.

If the screens load but every API call 401s, the cookie is being dropped: check
that the site is on HTTPS and that `NODE_ENV=production` is set.

## If the plan has no Node.js

Single and Premium plans serve static files only, so the API cannot run there.
The frontend can still be hosted on Hostinger, with the API somewhere that runs
Node (a Hostinger VPS, Render, Railway, Fly). In that case:

1. Upload `frontend/dist/student-fee-management/browser/` to `public_html`.
2. Add `public_html/.htaccess` so Angular's routes survive a refresh:

   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} -f [OR]
   RewriteCond %{REQUEST_FILENAME} -d
   RewriteRule ^ - [L]
   RewriteRule ^ index.html [L]
   ```

3. Point the frontend at the API's own origin by setting `API_BASE_URL` in
   `src/app/environments/environment.prod.ts` to e.g.
   `https://api.example.com/api`, then rebuild.
4. Set `FRONTEND_URL=https://lime-boar-741438.hostingersite.com` on the API, so
   its CORS headers allow the site. This is now a real cross-origin setup, so
   that variable stops being belt-and-braces and starts carrying the login.
