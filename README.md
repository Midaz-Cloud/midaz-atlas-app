This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Kiosk demo mode (`.env`)

Configuration uses [`react-native-config`](https://github.com/lugg/react-native-config). Copy `.env.example` to `.env` (default `KIOSK_DEMO_MODE=false`). For trade-show / QA demos, copy `.env.demo.example` to `.env.demo` or use the committed `.env.demo`.

| Variable | Default | When `KIOSK_DEMO_MODE=true` |
|----------|---------|----------------------------|
| `KIOSK_DEMO_MODE` | `false` | Enables demo layer (banner, scenario mocks, optional short delays) |
| `KIOSK_DEMO_REFERENCE_CODE` | `123456` | Valid payment reference suffix (P10b) |
| `KIOSK_DEMO_SCENARIO` | `default` | `default` \| `fiscal_error` \| `payment_fail` \| `pos_fail` |
| `KIOSK_DEMO_SHORT_TIMEOUTS` | `false` | Faster reference verify, P13 phases, P16/P19 timers |

### Kiosk API (backend)

| Variable | `.env.demo` | Local `.env` (gitignored) |
|----------|-------------|---------------------------|
| `KIOSK_API_USE_MOCK` | `true` (no network) | `false` to hit LAN backend |
| `KIOSK_API_BASE_URL` | — | e.g. `http://10.182.5.13:3000` |
| `KIOSK_API_KEY` | — | API key from admin |
| `KIOSK_UPLOADS_BASE_URL` | — | Same host, no `/api` |
| `KIOSK_DEVICE_SERIAL_OVERRIDE` | `AF910-DEMO-001` | If hardware serial is `unknown` |

`KIOSK_DEMO_MODE=true` **always** forces mock API (feria-safe). Flow: login → config + products → order (`displayOrderNumber`). See `docs/KIOSK_DEVELOPER_GUIDE.md` and `docs/ECR_NATIVE_MODULE.md`.

**Happy path:** reference suffix `123456` (or your `KIOSK_DEMO_REFERENCE_CODE`).

**Demo (Metro + `.env.demo`, hot reload):**

```sh
npm run android:demo    # como storybook:android: Metro + app demo
npm run start:demo      # solo Metro (segunda terminal: android:demo:install)
```

After changing `.env.demo`, run a **full native rebuild** (`android:demo` again). JS/assets hot-reload via Metro like Storybook.

**Physical device on Wi‑Fi (not emulator)?** In debug, PNG/SVG are loaded from Metro on your PC (`http://<PC-IP>:8081`), not from the APK. The phone must reach that IP (same network; firewall allows port 8081). Run `npm run metro:host` to print your LAN IP.

**Two terminals (app normal, Metro ya corriendo):** Terminal 1 → `npm run start`. Terminal 2 → `npm run android:install` (solo instala, sin levantar otro Metro). No ejecutes `storybook:stop` entre ellas (mata el puerto 8081).

**Un solo comando (`.env`, levanta Metro + app):** `npm run android` — igual que `android:demo` pero con `.env`.

**Kiosk demo con Metro (tiempo real, como Storybook):** Un solo comando levanta Metro + instala debug con `.env.demo`:

```sh
npm run android:demo
```

O dos terminales: Terminal 1 → `npm run start:demo` · Terminal 2 → `npm run android:demo:install`.

Tras cambiar `.env.demo`, recompila nativo (`android:demo`). En dispositivo Wi‑Fi, las imágenes vienen de Metro (`npm run metro:host` → IP del PC).

**Cambiar de Storybook a la app:** `npm run storybook:stop` y luego `npm run android:demo` o `npm run start:demo`.

**Instalar sin Metro (release, JS y assets en el APK):** No hace falta `npm run start`. Tras cambiar `.env` / `.env.demo`, vuelve a compilar.

```sh
npm run android:release       # .env — kiosk en dispositivo sin PC
npm run android:demo:release  # .env.demo — demo empaquetado
```

APK: `android/app/build/outputs/apk/release/app-release.apk`. La build tarda más que debug; no hay hot reload.

**Assets still red with Metro?** Stop bundlers (`npm run storybook:stop`), `npm run start` (binds to LAN IP), reload. On Wi‑Fi, set Dev menu → *Debug server host* → `<PC-IP>:8081`. Do not mix Storybook Metro with the kiosk app.

See also [`docs/SELF_SERVICE_KIOSK_FLUX.md`](../docs/SELF_SERVICE_KIOSK_FLUX.md).

### Kiosk API (mock vs live)

| Variable | Demo (`.env.demo`) | Local dev (`.env`) |
|----------|-------------------|-------------------|
| `KIOSK_API_USE_MOCK` | `true` (forced; demo mode also forces mock) | `true` = offline fixtures; `false` = live API |
| `KIOSK_API_BASE_URL` | ignored when mock | e.g. `http://10.182.5.13:3000` |
| `KIOSK_API_KEY` | ignored when mock | from admin (never commit real key) |
| `KIOSK_UPLOADS_BASE_URL` | ignored when mock | usually same host as API |
| `KIOSK_DEVICE_SERIAL_OVERRIDE` | optional | optional test serial |

Copy `.env.example` → `.env` and set real credentials locally only. Committed files use placeholders.

**Manual test matrix**

| Build | Expected bootstrap | Catalog | Payment methods | Order POST |
|-------|-------------------|---------|-----------------|------------|
| `npm run android:demo` | Mock, no network | `mockMenuCatalog` | débito + pago móvil (+ Zelle mock) | `ORD-DEMO-*` |
| `.env` + `KIOSK_API_USE_MOCK=false` | Live login + config/products | API images/URLs | From `enabledPaymentMethods` only | `displayOrderNumber` from API |
| POS screen (demo) | ECR mock success | — | — | — |
| POS screen (live, no `UsbSerialModule`) | Native ECR falls back / dev warning | — | — | — |

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
