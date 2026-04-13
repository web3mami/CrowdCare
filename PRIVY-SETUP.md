# Privy setup (CrowdCare)

Do these once; then `npm run dev` works.

## 1. Create a Privy app

1. Open [Privy Dashboard](https://dashboard.privy.io/) and sign in.
2. Create an app (or pick an existing one).
3. Copy the **App ID** (looks like `clp...`).

## 2. Put the App ID in `.env`

In the CrowdCare folder, create or edit `.env` (or `.env.local`):

```env
VITE_PRIVY_APP_ID=your_app_id_here
```

Restart the dev server after changing env vars.

## 3. Turn on login methods in the dashboard

In the Privy app settings, enable what you want users to see, for example:

- Twitter / X  
- Email  
- Wallet (Solana)

CrowdCare’s code asks for: **Twitter, wallet, email** (see `src/privy/CrowdCarePrivyProvider.jsx`). If a method is off in the dashboard, it simply won’t appear.

## 4. Allowed URLs

Add your origins under the app’s allowed domains / redirect URLs, for example:

- `http://localhost:5173` (Vite default)
- Your production URL (e.g. Vercel)

## 5. Deploy (e.g. Vercel)

Add the same variable in the host’s environment settings:

- Name: `VITE_PRIVY_APP_ID`  
- Value: your App ID  

Redeploy after saving.

## What the app does

- **Sign-in** is handled by Privy (modal).
- After login, CrowdCare copies your **Privy user id** and **Solana wallet address** into the same local session shape as before, so campaigns and profile keep working offline in the browser.
- **Sign out** clears that local session and logs out of Privy.

If anything fails, check the browser console and that `VITE_PRIVY_APP_ID` is set and the dev server was restarted.

### Windows: broken `node_modules`

If `npm run build` or `npm run dev` errors (for example `vite` not found, or many `TAR_ENTRY_ERROR` lines), delete dependencies and reinstall:

1. Close editors/terminals using the folder.
2. In the CrowdCare directory, delete the `node_modules` folder (File Explorer is fine if PowerShell `Remove-Item` complains).
3. Run: `npm install`
4. Run: `npm run build`
