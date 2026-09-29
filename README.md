# BuilderAI

BuilderAI is a React 19/Vite frontend and an Express 5 API backed by MongoDB/Mongoose. Authentication uses a signed JWT in an HttpOnly cookie; the browser sends it with credentialed API requests. AI project generation and revisions use OpenRouter.

## Local Development

1. Install dependencies with `npm --prefix client ci` and `npm --prefix server ci`.
2. Copy `client/.env.example` to `client/.env.local` and `server/.env.example` to `server/.env`. Set a private JWT secret of at least 32 bytes, a working MongoDB URI, and an OpenRouter API key in the server environment. Do not put server credentials in the client environment.
3. Start MongoDB, then run `npm --prefix server run dev`.
4. In another terminal, run `npm --prefix client run dev -- --host 0.0.0.0`; Vite prints the frontend URL (normally `http://localhost:5173`).

The API listens on port 8000 by default. `ORIGINS` is a comma-separated allowlist of exact frontend origins. The development example allows only Vite's default local origin. The API health endpoint is `/health`.

## Production

Recommended deployment: Netlify for the static frontend, Render for the Express API, and MongoDB Atlas for persistence. The `client/public/_redirects` file enables React Router deep links on Netlify.

1. Create an Atlas cluster and a database user with `readWrite` access only to the BuilderAI database. Add the Render service's outbound IP addresses to the Atlas network access list; avoid `0.0.0.0/0` in production. Copy the Atlas connection string into the API's `MONGODB_URI` setting and confirm TLS is enabled in the URI.
2. Create a Render Web Service from the repository. Set Root Directory to `server`, Build Command to `npm ci`, and Start Command to `npm start`. Configure the backend variables below in Render's environment settings. Attach `api.yourdomain.com` as a custom domain and wait for its HTTPS certificate.
3. Create a Netlify site from the repository. Set Base Directory to `client`, Build Command to `npm run build`, and Publish Directory to `dist`. Set the frontend variable below before deploying. Attach `yourdomain.com` as the custom domain and enable HTTPS.
4. Set the backend `ORIGINS` to the exact HTTPS frontend origin (for example `https://yourdomain.com`; add `,https://www.yourdomain.com` only if that origin is also served). Redeploy the API after setting it. Keep frontend and API on the same registrable domain so the secure SameSite=Lax cookie works.

Frontend build environment:

```text
VITE_API_URL=https://api.yourdomain.com/api
```

Backend environment (set in Render's environment settings; do not commit values):

```text
NODE_ENV=production
PORT=<provided by Render; do not set manually unless required>
APP_URL=https://api.yourdomain.com
ORIGINS=https://yourdomain.com
MONGODB_URI=<managed MongoDB connection string>
JWT_SECRET=<private random secret of at least 32 bytes>
COOKIE_SAME_SITE=lax
OPENROUTER_API_KEY=<private OpenRouter API key>
OPENROUTER_MODEL=openrouter/free
OPENROUTER_FALLBACK_MODEL=openrouter/free
```

Keep the frontend and API on the same registrable domain (for example, `yourdomain.com` and `api.yourdomain.com`) so the secure, SameSite=Lax cookie works across the API origin. `ORIGINS` must contain only the exact HTTPS frontend origin; never use `*`. The backend trusts one reverse proxy hop in production and marks the session cookie Secure. No separate migrations are needed: Mongoose creates/updates collections from the existing schemas.

Generate a production JWT secret locally with `openssl rand -hex 32`, then enter it directly in the Render environment settings. Do not put it in a `VITE_*` variable. Atlas database names/users, Render service settings, DNS records, and host secrets require manual configuration in those providers.

Build and start commands:

```sh
npm --prefix client ci
npm --prefix client run build
npm --prefix server ci
npm --prefix server start
```

The client production output is `client/dist`. Configure the frontend host to build from `client/` and publish `dist`; configure the API host to install/start from `server/`. Render supplies `PORT`; Express trusts one proxy hop and marks production cookies Secure. No separate migrations are needed: Mongoose creates/updates collections from the existing schemas.

## Existing API

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`, `DELETE /api/projects/:id`
- `PUT /api/projects/:id/files`, `POST /api/projects/:id/chat`, `POST /api/projects/:id/publish`
- Public: `GET /api/projects/public/:id`