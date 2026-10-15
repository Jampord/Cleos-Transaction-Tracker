# Development guide

## Prerequisites

- Node.js (LTS) and npm
- An Android phone with [Expo Go](https://expo.dev/go) (or an Android emulator)
- For builds: a free [expo.dev](https://expo.dev) account and `eas-cli` (`npm install -g eas-cli`)

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go
npx expo start -c       # same, with the cache cleared (use after changing config files)
```

Use `-c` whenever you change `babel.config.js`, `metro.config.js`, `app.json` or the theme.

**Do not run the web version.** `expo-sqlite` needs a WebAssembly file in browsers, and the app is not built for the web. Pressing `w` gives `Unable to resolve module ./wa-sqlite/wa-sqlite.wasm`.

## Checks before a release

```bash
npx expo-doctor              # are the packages consistent with the Expo SDK?
npx expo install --check     # list and fix mismatched package versions
npx tsc --noEmit             # type errors (run it from the project root, without file names)
npx expo lint
```

Metro does not stop on type errors, so `tsc` is the only thing that finds them before a build. If `tsc` says `Cannot use JSX unless the '--jsx' flag is provided`, it was run without the project's `tsconfig.json` (for example with a file name); run it from the project root with no arguments.

## Database changes

1. Edit `src/db/schema.ts`.
2. Generate the migration:
   ```bash
   npx drizzle-kit generate
   ```
3. Restart with `npx expo start -c`. The app applies new migrations at startup.

Commit the generated `drizzle/` folder. **The app cannot create its database without it**, so it must not be in `.gitignore`.

Prefer additive changes (new tables, new columns with a default): they apply without questions. Renaming or dropping a column makes drizzle-kit ask interactive questions and needs a careful look at the generated SQL.

### Starting over in development

- In a development build, **Settings → "DEV: delete all entries"** wipes entries and keeps settings. The button does not exist in release builds.
- For a completely fresh database, change the file name in `src/db/client.ts` (for example `cleos-test2.db`).
- Expo Go and an installed APK have **separate databases**.

## Project conventions

- Money is integer centavos everywhere. Format with `formatPeso`, convert with `pesosToCentavos`.
- Business logic goes in `src/lib` as pure functions. Screens call it; they don't re-implement it.
- Only `src/db/queries.ts` talks to the database.
- Colors come from `src/ui/theme.ts` (`colors`), never typed in as hex strings, so dark mode works.
- New screens use the components in `src/ui/components.tsx` (`Screen`, `Card`, `Field`, `Button`, `Row`, and so on).
- Keep button and toggle labels short; they wrap at two lines.

## Tests

There are no automated tests yet. The worked examples at the end of [BUSINESS_RULES.md](BUSINESS_RULES.md) are written as test vectors for `src/lib` (`fees`, `summary`, `utang`, `cashcheck`). Adding a test runner such as Jest or Vitest and encoding those cases is the best next investment.

## Building an installable APK (EAS)

One-time setup:

1. In `app.json`, inside `"expo"`:

   ```json
   "name": "Cleo's Tracker",
   "slug": "cleos-transaction-tracker",
   "version": "1.0.0",
   "orientation": "portrait",
   "userInterfaceStyle": "automatic",
   "android": { "package": "com.yourname.cleostracker" }
   ```

   - `android.package` is the app's **permanent identity**. A different package is a different app and cannot read this app's data. Choose it once.
   - `name` is the label under the icon; Android truncates long labels, hence the short name.
   - `"userInterfaceStyle": "automatic"` is required for the _Automatic_ appearance option.

2. ```bash
   eas login
   eas init
   eas build:configure
   ```
3. In `eas.json`, make sure the `build` section has an APK profile:
   ```json
   "preview": {
     "distribution": "internal",
     "autoIncrement": true,
     "android": { "buildType": "apk" }
   }
   ```
   `autoIncrement` raises the Android version code on every build, which is what lets a new APK install over an old one.

Build:

```bash
eas build --platform android --profile preview
```

On the first build, let EAS **generate a new keystore**. When it finishes, open the link on the phone, download the APK, allow installing from that source, and install (choose _Install anyway_ if Play Protect warns about an unknown app).

### Keystore

The keystore signs the app. A new version can only be installed over the old one if it is signed with the **same** key.

- EAS stores it under your Expo account.
- Download a copy and keep it somewhere safe, **outside the repository**: `eas credentials` → Android → download the keystore.
- If it is lost, the only way forward is to uninstall and reinstall, which deletes the app's data. That is why backups matter.

### Updating the app on a phone that is in use

1. **Back up first** (Settings → Backup and restore).
2. Build again with the same command.
3. Install the new APK **over** the old one. Never uninstall; that erases the data.
4. Check that the data is still there.

### Release checklist

- [ ] `expo-doctor`, `expo install --check` and `tsc` are clean
- [ ] Walk through every screen in light and dark mode
- [ ] Airplane mode: record one entry of each kind
- [ ] Back up, record an entry, restore the backup: the entry disappears
- [ ] No "DEV" button in Settings
- [ ] `version` bumped in `app.json`; `CHANGELOG.md` updated
- [ ] A backup of the phone's data taken before installing the update

## What not to commit

Add this to `.gitignore`. Backups and exports contain customer names, and the keystore can sign apps as you.

```gitignore
# Data and secrets: never commit these
*.db
*.sqlite
cleos-backup-*
cleos-export-*.csv
*.jks
*.keystore
credentials.json
.env*
```

Keep `drizzle/` committed.

## Known pitfalls

Problems hit while building this, and their fixes.

| Symptom                                                                          | Cause and fix                                                                                                                                                               |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Parameter 'api' implicitly has an 'any' type` or `Cannot find name '__dirname'` | `babel.config` and `metro.config` were saved as `.ts`. They must be `.js` (CommonJS).                                                                                       |
| `Unable to resolve module ./wa-sqlite/wa-sqlite.wasm`                            | The web bundle is being built. Run on a phone only; do not press `w`.                                                                                                       |
| Restore: `Missing 'READ' permission` when reading the picked file                | The document picker's copy cannot be read by the file API. Use `File.pickFileAsync()`, which grants read access.                                                            |
| Restore: `undefined is not a function`                                           | In SDK 57 `File.pickFileAsync()` returns `{ canceled, result }`, not the file. Use `result`.                                                                                |
| `Appearance.setColorScheme(null)` rejected by TypeScript                         | React Native 0.86 expects `"unspecified"` for "follow the phone".                                                                                                           |
| Tab bar icon type error (`ColorValue` vs `string`)                               | The tab bar passes `ColorValue`. Type the parameter as `ColorValue` and cast when passing to the icon.                                                                      |
| Header and tab bar stay in the old colors after switching theme                  | They belong to the navigator, not the screens. The tabs layout is rebuilt on a mode change (`key={scheme}`).                                                                |
| Text invisible in dark mode on one screen                                        | The screen still has typed-in colors (`"white"`, `"#555"`) or text with no color. Use `colors.*` and the shared components.                                                 |
| `App not installed` when installing an APK                                       | An older copy signed with a different key is on the phone, or the version code is not higher. Uninstall the _test_ copy (never a real one) or rebuild with `autoIncrement`. |
| Blank screen or `Database error` on the installed app                            | The migrations did not reach the build. Check that `drizzle/` exists and is not ignored.                                                                                    |
