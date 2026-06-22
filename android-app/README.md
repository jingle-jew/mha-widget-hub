# MHA Android WebView prototype

This folder is an isolated first attempt at running MHA Control Hub as a launcher-friendly Android app.

The app is intentionally thin:

- it asks for a Home Assistant base URL on first launch;
- it saves that URL locally;
- it opens `<Home Assistant URL>/mha-control-hub` in the same Android WebView;
- Home Assistant handles login/session persistence inside the WebView.

## Try it locally

```bash
cd android-app
npm install
npm run start
```

## Create the Android project

```bash
cd android-app
npm install
npm run build
npx cap add android
npx cap open android
```

After the native Android project exists, use:

```bash
npm run android
```

## Notes

This V1 does not store or inject a Long-Lived Access Token. That is deliberate: a future version should use platform secure storage before handling tokens directly.
## External Home Assistant URLs

Capacitor normally protects the app WebView by opening external origins in the device browser. This prototype sets `server.allowNavigation` to `["*"]` so the configured Home Assistant URL stays inside the MHA app WebView.

For a production app, replace the wildcard with the exact allowed hosts for your Home Assistant instances.



## Immersive Android mode

The Android wrapper is configured to behave like a dedicated MHA launcher.

`npm run sync` now does three things:

```bash
npm run build
npx cap sync android
npm run android:immersive
```

The last step patches the generated Android `MainActivity.java` so the app hides the Android status bar and navigation bar using immersive sticky mode. Android can temporarily show the system bars again if the user swipes from the screen edge, then hides them again automatically.

If you delete and recreate the generated `android/` folder, run:

```bash
npm run sync
```

or manually:

```bash
npm run android:immersive
```

before opening Android Studio.

## Android shell theme

The local launcher screen now follows the Android/browser color scheme automatically. Before MHA is opened, the setup card uses the same glass-inspired visual language as MHA Control Hub, with separate light and dark token values through `prefers-color-scheme`.

This only affects the local Android setup shell. Once the app navigates to `/mha-control-hub`, the real MHA frontend and its own theme system take over.
