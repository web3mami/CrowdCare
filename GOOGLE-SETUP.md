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
