# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [semantic versioning](https://semver.org/).

## [1.0.0] - 2026-10-15

First release: a complete replacement for the paper notebook, running offline on Android.

### Added

**Recording**

- Cash-in, cash-out and load entries with an automatic, editable GCash fee table (₱1 to ₱10,000).
- Cash-out fee on top or deducted, with an "At the counter" panel that says how much to hand over.
- Load fee rule (default ₱5 below ₱100) and load cost percentage, both editable.
- Water sales and water deliveries, a running "water left" count, and a warning when a sale exceeds the recorded stock.
- Paid or unpaid on every entry; name suggestions from earlier entries.
- Edit, soft-delete and restore for entries, and for water deliveries.

**Utang**

- Customer balances, grouped by name.
- Partial payments by cash or GCash, applied to the oldest entries or to a chosen one.
- Payment history on each entry, with the ability to remove a payment.
- Entries with payments are locked except for the name.

**Reporting**

- Today screen: profit, sales (GCash fees, load, water), GCash moved, total utang, water left.
- Day picker to browse past days.
- Cash check with opening balances, expected cash and GCash, and a comparison with the real count.
- Settings switches for how load and water deliveries are paid.

**Data safety**

- Backup to a database file through the share sheet.
- CSV export of every table.
- Restore from a backup file.
- Backup reminder after 7 days.

**Interface**

- Bottom tabs (Today, Utang, Water, Cash check), settings and a theme toggle in the header.
- Light, dark and automatic appearance.
- Reusable UI kit and theme (`src/ui`).

### Known limitations

- Android only; single user, single phone, no sync.
- No automated tests yet.
- Fee lookup does not handle amounts with centavos that fall between tiers.
- See [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md#known-limitations) for the full list.
