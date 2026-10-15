# Cleo's Transaction Tracker

An offline Android app that replaces a small shop's paper notebook. It records **GCash cash-in / cash-out**, **mobile load** and **mineral water** sales, works out fees, profit and who owes money, and checks the cash drawer and GCash wallet at the end of the day.

Built for a family business in the Philippines. Amounts are in Philippine pesos (₱).

> **Status:** version 1.0.0. Built and tested on a developer's phone; the next step is a pilot run alongside the paper notebook.

---

## Why this exists

The shop kept everything in a notebook: each GCash transaction with its fee, whether it was paid, how many gallons of water were delivered and sold, and who owed money. Fees were calculated by hand, and there was no way to see a day's profit or to catch a mistake in the cash drawer. This app keeps the same flow, so nobody has to relearn the business, and does the arithmetic.

## Features

**Recording**

- Cash-in, cash-out and load entries with the **GCash fee filled in automatically** from an editable fee table (₱1 to ₱10,000; a manual fee above that).
- Cash-out fee handled both ways: _on top_ (customer pays the fee extra) or _deducted_ (customer receives the amount minus the fee). The form shows exactly how much to hand over.
- Water sales (gallons × price) and water deliveries, with a running **"water left"** count and a warning when a sale would go below the recorded stock.
- Paid / unpaid (_utang_) on every entry, with name suggestions from earlier entries.
- Edit any entry, delete it (soft delete), and bring it back from **Deleted entries**.

**Understanding the day**

- **Today** screen with profit, sales and their breakdown (GCash fees, load, water), a day picker to browse past days, and the current total owed to her.
- **Utang** screen: each customer's balance, **partial payments** (cash or GCash), payments applied to the oldest entries or to a chosen one, and the ability to remove a wrong payment.
- **Cash check**: enter the real cash and GCash balances and the app compares them with what the records say they should be (_Matches_, _Short ₱X_, _Over ₱X_).

**Keeping the data safe**

- **Backup** to a single database file through the phone's share sheet, **CSV export** for spreadsheets, and **restore** from a backup file.
- A reminder on the Today screen when there has been no backup for 7 days.

**Comfort**

- Large touch targets, one color per entry type, **light and dark mode** (with an Automatic option that follows the phone).

## Screenshots

> Add screenshots to `docs/screenshots/` and link them here.

| Today        | New entry    | Utang        | Cash check   |
| ------------ | ------------ | ------------ | ------------ |
| _screenshot_ | _screenshot_ | _screenshot_ | _screenshot_ |

## Tech stack

Versions are the ones in `package.json` at release 1.0.0. Check that file for the exact current ones.

### Core

| Area          | Technology                                                                                            | Version                  |
| ------------- | ----------------------------------------------------------------------------------------------------- | ------------------------ |
| App framework | [Expo](https://expo.dev) (managed workflow)                                                           | SDK 57 (`expo ~57.0.27`) |
| UI runtime    | [React Native](https://reactnative.dev) + [React](https://react.dev)                                  | 0.86.3 / 19.2.3          |
| Language      | [TypeScript](https://www.typescriptlang.org)                                                          | ~6.0.3                   |
| Navigation    | [expo-router](https://docs.expo.dev/router/introduction/) (file-based routing, bottom tabs and stack) | ~57.0.25                 |

### Data

| Area       | Technology                                                                                   | Version           |
| ---------- | -------------------------------------------------------------------------------------------- | ----------------- |
| Database   | SQLite on the device, via [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/) | ~57.0.4           |
| ORM        | [Drizzle ORM](https://orm.drizzle.team) (typed queries)                                      | ^0.45.4           |
| Migrations | `drizzle-kit` (generates SQL), bundled with `babel-plugin-inline-import`                     | ^0.31.11 / ^3.0.0 |

### Files and sharing

| Area                                   | Technology                                                                  | Version  |
| -------------------------------------- | --------------------------------------------------------------------------- | -------- |
| Reading and writing files, file picker | [`expo-file-system`](https://docs.expo.dev/versions/latest/sdk/filesystem/) | ~57.0.7  |
| Share sheet (backup and CSV export)    | [`expo-sharing`](https://docs.expo.dev/versions/latest/sdk/sharing/)        | ~57.0.23 |

### Interface

| Area                             | Technology                                                                                                          | Version                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Icons                            | [`@expo/vector-icons`](https://docs.expo.dev/guides/icons/) (Ionicons)                                              | ^15.0.2                |
| Status bar and system background | `expo-status-bar`, `expo-system-ui`                                                                                 | ~57.0.1 / ~57.0.4      |
| Navigation foundations           | `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`, `react-native-reanimated` | from the Expo template |
| Design system                    | In-house: `src/ui/theme.ts` (light and dark palettes) and `src/ui/components.tsx`                                   | n/a                    |

### Build and tooling

| Area                          | Technology                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Installable app               | [EAS Build](https://docs.expo.dev/build/introduction/) producing an Android APK |
| Dependency and project checks | `expo-doctor`, `npx expo install --check`                                       |
| Type checking                 | `tsc --noEmit`                                                                  |
| Development on a phone        | [Expo Go](https://expo.dev/go)                                                  |

### Planned, not built

| Area                      | Technology                                                                      |
| ------------------------- | ------------------------------------------------------------------------------- |
| Backup and remote viewing | Node.js (Express or Fastify) with Postgres. See the [roadmap](docs/ROADMAP.md). |

There is **no backend**. The app does not make network requests, and the data lives only on the phone. A Node.js backend for automatic backup is on the [roadmap](docs/ROADMAP.md) but not built.

## Getting started

Requirements: Node.js (LTS), a recent Android phone with [Expo Go](https://expo.dev/go) for development.

```bash
git clone <your-repo-url>
cd cleos-tracker
npm install
npx expo start
```

Scan the QR code with Expo Go. Press `a` for an Android emulator. Do **not** press `w` (web): `expo-sqlite` needs extra setup in browsers and the app is not meant for it.

After changing `src/db/schema.ts`, generate a migration and restart:

```bash
npx drizzle-kit generate
npx expo start -c
```

## Building an installable app

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

This produces an APK you can install directly. The full release and update process, including keystore handling, is in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Project structure

```
src/
  app/            Screens (expo-router)
    (tabs)/       Today, Utang, Water, Cash check
    new.tsx       GCash / load entry form (create and edit)
    water-sale.tsx, water-delivery.tsx, utang-customer.tsx,
    settings.tsx, fee-table.tsx, backup.tsx, deleted.tsx
  db/             SQLite schema, queries, seed data, database client
  lib/            Pure business logic (money, fees, summary, utang, cash check, CSV)
  components/     Shared feature components (name suggestions, payment history)
  ui/             Theme (light/dark) and the reusable UI kit
drizzle/          Generated SQL migrations (bundled into the app)
```

## Documentation

| Document                                         | What it covers                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) | Every rule and formula: fees, profit, utang, water stock, cash check, with worked examples |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)     | Layers, data model, theming, backup and restore internals, design decisions                |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)       | Setup, migrations, building and releasing, known pitfalls                                  |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md)         | A plain-language guide for the shop owner                                                  |
| [docs/ROADMAP.md](docs/ROADMAP.md)               | What is not built yet, and research on GCash / GlobeOne integration                        |
| [CHANGELOG.md](CHANGELOG.md)                     | Release notes                                                                              |

## Data and privacy

- All records stay on the phone. Customer names and numbers are only stored locally.
- **Backups and CSV exports contain customer names.** Never commit them to this repository (see the `.gitignore` notes in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)).
- The app never asks for a GCash or GlobeOne login, MPIN or OTP, and never reads those apps.

## Known limitations

- Android only. iOS has not been tested.
- Single user, single phone. There is no sync.
- The GCash fee lookup works in whole pesos; an amount with centavos can fall between two tiers (see [BUSINESS_RULES](docs/BUSINESS_RULES.md#known-limitations)).
- The cash check assumes one cash drawer for GCash cash and water cash.
- There are no automated tests yet. The logic in `src/lib` is written as pure functions so tests are easy to add.

## License

© 2026 John Ford Actub. All rights reserved. The source code is public for reference only and may not be copied or reused without permission.
