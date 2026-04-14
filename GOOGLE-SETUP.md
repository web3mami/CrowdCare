# Google Sign-In (CrowdCare)

CrowdCare uses **Google Identity Services** in the browser. There is **no Privy** and no client secret in the frontend.

---

## 1. Google Cloud OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID** → type **Web application**.
3. Under **Authorized JavaScript origins**, add **both**:
   - `http://localhost:5173` (Vite dev)
   - `https://crowd-care-ten.vercel.app` (production — change if your Vercel URL differs)
4. Save and copy the **Client ID** (ends with `.apps.googleusercontent.com`).

You do **not** need redirect URIs for the GIS button flow used here.

---

## 2. Local environment (`.env` / `.env.local`)

In the CrowdCare project root:

```env
VITE_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
```

- Do **not** commit real values; keep them in `.env.local` (gitignored) or only in the host.
- Restart the dev server after changing: `npm run dev`.

---

## 3. Vercel environment variables and redeploy

Do this in the [Vercel dashboard](https://vercel.com/) for the **CrowdCare** project (the one that deploys `crowd-care-ten.vercel.app`).

### 3a. Add Google client ID

1. **Project** → **Settings** → **Environment Variables**.
2. **Add**:
   - **Key:** `VITE_GOOGLE_CLIENT_ID`
   - **Value:** the same Web client ID from §1 (ends with `.apps.googleusercontent.com`).
   - **Environments:** enable at least **Production** (and **Preview** if you use preview deployments).
3. Save.

### 3b. Remove old Privy variable (recommended)

1. Still under **Environment Variables**, find **`VITE_PRIVY_APP_ID`** if it exists.
2. **Remove** it for all environments so builds don’t confuse old docs or scripts.

### 3c. Redeploy

Env vars are baked in at **build** time for Vite.

1. **Deployments** → open the latest deployment → **⋯** → **Redeploy** (or push a new commit to `main`).
2. Wait until the new deployment is **Ready**, then hard-refresh the site (`Ctrl+Shift+R`).

### Optional: Vercel CLI

If you use the CLI (`npm i -g vercel` → `vercel login` → `vercel link` in this repo):

```bash
vercel env add VITE_GOOGLE_CLIENT_ID production
# paste the client ID when prompted
vercel env rm VITE_PRIVY_APP_ID production   # if present; confirm removal
vercel --prod
```

---

## 4. What happens on sign-in

Google returns a **credential JWT**. CrowdCare reads your Google `sub` and **derives a Solana keypair locally** (`src/lib/keypair.js`) and stores session data in `localStorage` (`crowdcare_user`). Same Google account on the same derivation = same address.

---

## 5. Troubleshooting

- **Google button missing or “Setup” banner:** `VITE_GOOGLE_CLIENT_ID` is empty in the **built** app — fix Vercel env (§3) and **redeploy**.
- **Sign-in fails after click:** Open the browser **console**; confirm **Authorized JavaScript origins** in Google Cloud include the **exact** origin you’re using (`https://crowd-care-ten.vercel.app`, no trailing slash).
- **Still see old Privy UI:** That was an older deployment; confirm latest commit is deployed and do a hard refresh.

---

## 6. Admin dashboard (`/admin`)

The app records **distinct Google accounts** (`sub`) in Neon when users sign in (or sync/delete a campaign). Only you can read the total via **`/admin`** using HTTP Basic auth.

### 6a. Environment variables (Vercel)

Add for **Production** (and Preview if you use it):

| Key | Value |
| --- | --- |
| `ADMIN_PASSWORD` | A long random password (only you know it) |

The admin **username is fixed** as **`Mami`** in the app; you only configure the password.

`DATABASE_URL` must already be set (same Neon DB as campaigns). Redeploy after adding variables.

Remove any old `ADMIN_USERNAME` variable if you added it earlier — it is no longer used.

### 6b. Using `/admin`

1. Open `https://your-deployment.vercel.app/admin` (use your real host).
2. Sign in as **Mami** with the **password** from `ADMIN_PASSWORD` (the page only asks for the password).
3. The page shows **Accounts recorded** (unique Google `sub` values seen by the server).

If you see “Admin is not configured”, the server is missing `ADMIN_PASSWORD`. If the count stays `0`, confirm `DATABASE_URL` is set and users have signed in against production (local `npm run dev` only counts if `vercel dev` or API hits your Neon URL).

### 6c. “Failed to fetch” on `/admin`

- **Production:** In a new tab, open `https://YOUR-DOMAIN/api/health`. You should see `{"ok":true,"service":"crowdcare-api"}`. If the page errors or shows HTML, API routes are not deployed with that URL (wrong host or static-only hosting).
- **Local `npm run dev`:** Vite does not run `api/` itself. Either:
1. Add to `.env.local`: `VITE_DEV_API_PROXY=https://YOUR-DEPLOYMENT.vercel.app` (no trailing slash), restart `npm run dev` — all `/api/*` requests proxy to production; or  
  2. Run `npm run dev:vercel` so API runs locally with Vercel.
