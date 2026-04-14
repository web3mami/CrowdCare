# Google Sign-In (CrowdCare)

CrowdCare uses **Google Identity Services** in the browser. There is **no Privy** and no client secret in the frontend.

## 1. Google Cloud OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID** → type **Web application**.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (Vite dev)
   - Your production origin, e.g. `https://your-app.vercel.app`
4. Copy the **Client ID** (ends with `.apps.googleusercontent.com`).

You do **not** need to add redirect URIs for the GIS button flow used here.

## 2. Environment variable

In the CrowdCare project root, `.env` or `.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
```

Restart `npm run dev` after changing env vars.

## 3. Vercel (or other host)

Add the same variable in project settings, then redeploy:

- Name: `VITE_GOOGLE_CLIENT_ID`
- Value: your Web client ID

## 4. What happens on sign-in

Google returns a **credential JWT**. CrowdCare reads your Google `sub` and **derives a Solana keypair locally** (see `src/lib/keypair.js`) and stores session data in `localStorage` (`crowdcare_user`). Same device = same wallet address for the same Google account.

## Troubleshooting

- **Button loads but sign-in fails:** Check browser console; confirm origins match the URL you are using (including `https` vs `http`).
- **“Error 400: redirect_uri_mismatch”** is rare for GIS; if you see OAuth errors, verify the client is **Web application** and origins are saved.
