# Tab-Pri Web

The runnable mobile-first PWA for the private encrypted tab vault.

## Local PC test

```cmd
cd web
npm install
npm run dev
```

Create `web/.env.local` locally (never commit it):

```env
RENDER_API_KEY=your_tab_pri_random_secret
```

The Vite dev server injects this secret only into its local proxy. The browser never receives it.

## Production

Deploy the repository with Vercel using the included `vercel.json`. Add these Vercel environment variables:

- `RENDER_API_KEY` — the same random Tab-Pri backend secret configured on Render.
- `RENDER_ORIGIN` — optional; defaults to `https://tab-pri.onrender.com`.

The root `/api/vault` serverless function keeps the Render secret server-side.

## Security model

- Master passwords never leave the browser.
- Vault data is encrypted with PBKDF2-SHA-256 + AES-256-GCM before saving.
- Render/D1 receives only the encrypted vault blob.
- Password changes decrypt locally, then encrypt again with a fresh salt.
- Destroying the vault sends only an authenticated DELETE request.
- Browser capture is user-triggered; private tabs are marked `private` and require the same explicit save action as normal tabs.

## Current capture transport

The desktop Chromium extension captures open tabs and sends a normalized session to the local PWA through a base64url hash handoff. It is suitable for the first PC test. A later transport can replace the hash when very large sessions need a more robust channel.
