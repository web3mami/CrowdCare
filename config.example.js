/**
 * Legacy pattern (pre-Vite): copy to config.js and load before the app.
 * The React app reads the client ID from Vite env instead:
 *
 *   Copy .env.example to .env and set:
 *   VITE_GOOGLE_CLIENT_ID=....apps.googleusercontent.com
 *
 * https://console.cloud.google.com/apis/credentials
 *
 * Authorized JavaScript origins (examples):
 *   https://web3mami.github.io
 *   https://your-project.vercel.app
 *   http://localhost:5173
 *
 * No client secret is used in the browser (GIS only needs the client ID).
 */
window.CROWDCARE_CONFIG = {
  googleClientId: "YOUR_CLIENT_ID.apps.googleusercontent.com",
};
