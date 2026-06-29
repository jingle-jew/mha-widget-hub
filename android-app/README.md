# MHA Android WebView wrapper

This folder contains the Android wrapper used to run MHA Widget Hub as a launcher-friendly app and to build APK artifacts from GitHub Actions.

The app is intentionally thin:

- it asks for a Home Assistant base URL on first launch;
- it saves that URL locally;
- it opens `<Home Assistant URL>/mha-widget-hub` in the same Android WebView;
- Home Assistant handles login/session persistence inside the WebView.

## Try it locally

```bash
cd android-app
npm install
npm run start
```

## Open the native Android project

```bash
cd android-app
npm install
npm run android
```

The native `android/` project is already committed in this repository, so `npx cap add android` is no longer part of the normal workflow.

## Build APKs locally

### Debug APK

```bash
cd android-app
npm install
npm run build:apk:debug
```

Output:

```bash
android-app/android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK

```bash
cd android-app
npm install
npm run build:apk:release
```

If release signing secrets are configured and a keystore file is available, Gradle produces a signed release APK. If they are missing, Gradle logs a clear fallback message and produces an unsigned release APK instead.

Expected output folder:

```bash
android-app/android/app/build/outputs/apk/release/
```

## GitHub Actions artifact build

The workflow [`.github/workflows/build-android-apk.yml`](../.github/workflows/build-android-apk.yml) builds the Android wrapper and uploads the release APK as a GitHub Actions artifact.

After the workflow finishes:

1. Open the workflow run in GitHub.
2. Open the `Artifacts` section.
3. Download the `mha-widget-hub-apk` artifact.

This first phase publishes the APK as an Actions artifact. A second workflow can also attach the same APK build output to a GitHub Release without changing the Android build path.

## GitHub Release asset publishing

The workflow [`.github/workflows/publish-android-release-asset.yml`](../.github/workflows/publish-android-release-asset.yml) is the next step for distribution.

- On a published GitHub Release, it rebuilds the Android wrapper and attaches the APK to that release.
- On `workflow_dispatch`, it falls back to uploading the APK as an artifact so the workflow can still be tested without publishing a release.

If signing secrets are present, the release receives a signed APK. If not, it receives an unsigned APK with `-unsigned` in the filename.

## GitHub secrets for signed release builds

Create these repository secrets before expecting a signed release artifact:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The workflow decodes `ANDROID_KEYSTORE_BASE64` into a temporary keystore file on the runner only. No keystore should be committed to the repository.

If these secrets are absent, the workflow still runs and uploads an unsigned release APK artifact. That fallback is useful for validating the build chain before enabling signing.

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

The local launcher screen now follows the Android/browser color scheme automatically. Before MHA is opened, the setup card uses the same glass-inspired visual language as MHA Widget Hub, with separate light and dark token values through `prefers-color-scheme`.

This only affects the local Android setup shell. Once the app navigates to `/mha-widget-hub`, the real MHA frontend and its own theme system take over.
