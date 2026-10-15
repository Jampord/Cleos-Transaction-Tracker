# Roadmap

Nothing here is committed. It is a list of ideas, in rough order of value, so that decisions can be made after the app has had real use.

## Before anything else: validate with real use

The app is only as good as its match with the shop. Run it **alongside the paper notebook** for a couple of weeks and compare each evening's sales, profit, utang and cash check. Anything that does not match is either a bug or a rule that was not modeled.

Open questions:

- **Load cost.** What actually leaves the GCash wallet for a ₱100 load, and is it the same for every network and amount? Until it is set (**Settings → Load → Load cost**), load profit shows only the fee and the GCash cash check will drift on loads.
- **GlobeOne load wallet.** If load is also bought through a separate GlobeOne retailer balance, the cash check needs a third balance.
- **Water deliveries paid from GCash.** The app assumes cash from the drawer. A third payment option would be needed otherwise.

## Near term

- [ ] **Automated tests** for `src/lib`, using the worked examples in [BUSINESS_RULES.md](BUSINESS_RULES.md).
- [ ] **A proper app icon** and splash screen (1024×1024 icon plus an adaptive foreground).
- [ ] **Fractional pesos in the fee lookup** (fall back to the nearest tier instead of asking for a manual fee).
- [ ] **A payment audit trail** (keep removed payments as hidden rather than deleting them).
- [ ] **Reset the Today screen at midnight** if the app has been left open.

## Reports and quality of life

- Weekly and monthly summaries (sales, profit, utang collected), with a chart.
- A customer statement: a shareable list of what one customer owes.
- Low-stock reminder for water.
- Compare a day's cash-check differences over time to spot patterns.
- Quick-repeat for the most common entries.

## Node.js backend (optional)

The original plan included a small backend for **automatic backup** and so the owner's family can **see the numbers remotely**. It is not needed for a single phone, since manual backup and restore work, so it is best built only if the pilot shows a need.

Sketch:

- Node.js (Express or Fastify) with Postgres.
- The phone keeps working offline and **syncs** its records when there is a signal. Records need stable unique ids and `updated_at` timestamps first (today they use local integer ids).
- A read-only dashboard for remote viewing.
- Authentication, and encryption of customer names in transit and at rest.

The hardest part is conflict handling if two devices ever edit the same data, which is why a single writer (the shop phone) is the safe starting point.

## Recording GCash and GlobeOne transactions automatically

**Findings (checked October 2026; verify before relying on them).**

- **GCash:** one 2026 integration guide says GCash does not publish an open merchant API and that direct access is limited to selected partners. The APIs and gateways that exist are for businesses _accepting_ payments from customers, and need business registration and a compliance review. They are not a way to read the cash-ins and cash-outs of a personal wallet used as an agent. A personal account can request its history from the GCash app (it is emailed), and a GCash for Business account has a web portal with a CSV export of its transactions.
- **GlobeOne:** Globe's help page lists _Buy Load_ as available to retailers, but lists _View Historical Transactions_ as not yet available. The app also cannot be used on more than one device at a time. No public API or export was found.

References:

- https://help.gcash.com/hc/en-us/articles/360034155433 (requesting transaction history)
- https://help.gcash.com/hc/en-us/articles/48457463083545 (GCash for Business history download)
- https://www.globe.com.ph/help/globeone/navigation-features (GlobeOne features)

**What this means.** A direct connection that pulls transactions in is not available. Reading the apps' screens or automating them is **not** an option: it risks the owner's account and money, and can lock her out. The app must never hold a GCash or GlobeOne login, MPIN or OTP.

**Options that could work, in order of effort:**

1. **Paste a confirmation.** She copies the confirmation text of a transaction; a "Paste" button on the entry form reads the amount and number from it and pre-fills the form. No special permissions; needs a clipboard add-on and a new build.
2. **Notification drafts (Android).** The app reads the notifications the GCash and GlobeOne apps show and offers each as a **draft** she confirms with a tap. Needs the special "notification access" permission, and is the most fragile if wording changes.
3. **Statement reconciliation.** Import an exported statement (for example a GCash for Business CSV) and list transactions that have no matching entry.

All of these can only **suggest** an entry. The app cannot know whether cash was handed over, who owes what, or whether the fee was deducted. Their real value is finding transactions that were forgotten.

Before building any of them, collect real examples (with names and numbers blurred) of: a GCash cash-in notification or SMS, a cash-out (money received), and a load purchase. Any parsing depends entirely on the exact wording, which changes without notice, and an unrecognized message must be ignored so that manual entry always works.

## Not planned

- Multi-user logins and permissions
- iOS support (untested; the restore flow uses an Android-only file picker)
- Anything that reads or controls other apps on the phone
