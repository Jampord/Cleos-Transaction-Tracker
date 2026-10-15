# Business rules

This is the source of truth for what the app calculates and why. The code that implements each rule is named in brackets. If you change a rule, change it here too.

All amounts are Philippine pesos. Internally every amount is stored as **whole centavos** (₱35.50 is `3550`) so that no rounding error can creep in. Totals, balances and stock are always **calculated from the entries**, never stored, so an edit can never leave a total out of date.

---

## 1. GCash fees

`src/lib/fees.ts`, `fee_tiers` table

The fee for cash-in and cash-out comes from one table (the same for both). These are the defaults that are loaded on first launch; the shop owner can change any fee in **Settings → GCash fee table**.

| Amount (₱)     | Fee (₱) |
| -------------- | ------- |
| 1 – 100        | 5       |
| 101 – 500      | 10      |
| 501 – 1,000    | 20      |
| 1,001 – 1,500  | 30      |
| 1,501 – 2,000  | 40      |
| 2,001 – 2,500  | 50      |
| 2,501 – 3,000  | 60      |
| 3,001 – 3,500  | 70      |
| 3,501 – 4,000  | 80      |
| 4,001 – 4,500  | 90      |
| 4,501 – 5,000  | 100     |
| 5,001 – 5,500  | 110     |
| 5,501 – 6,000  | 120     |
| 6,001 – 6,500  | 130     |
| 6,501 – 7,000  | 140     |
| 7,001 – 7,500  | 150     |
| 7,501 – 8,000  | 160     |
| 8,001 – 8,500  | 170     |
| 8,501 – 9,000  | 180     |
| 9,001 – 9,500  | 190     |
| 9,501 – 10,000 | 200     |

Rules:

- Both ends of a range are inclusive.
- The fee box is filled in automatically while the amount is typed. As soon as the shop owner types her own fee, the app stops overwriting it.
- An amount above ₱10,000 is outside the table. The form shows a warning and asks for a manual fee; saving is blocked until one is entered.
- Editing a tier only affects **new** entries. Saved entries keep the fee they were recorded with.

## 2. Load fee and load cost

`src/lib/fees.ts`, settings `load_fee`, `load_fee_threshold`, `load_cost_percent`

- A **fee** is added to small loads: by default ₱5 on loads **below ₱100**, nothing at ₱100 and above. Both numbers are editable (**Settings → Load**). The fee can always be overridden by typing a different one on the entry.
- The **cost** of a load is what actually leaves the GCash wallet. It is stored on each load as `amount × load_cost_percent / 100`, at the time the load is made, so changing the percentage later never rewrites old entries. The default is 100%.
- If a load is edited, its cost is scaled in proportion to the new amount.
- Loads recorded before a cost existed have no cost. They are treated as costing their face value (so their profit is just the fee).

## 3. Entry types and how money moves

`src/lib/cashcheck.ts`

`A` is the amount and `F` the fee.

| Entry                                         | What happens at the counter                                     | Cash drawer           | GCash wallet |
| --------------------------------------------- | --------------------------------------------------------------- | --------------------- | ------------ |
| **Cash-in**, paid                             | Customer hands over `A + F` in cash; she sends `A` by GCash     | `+A + F`              | `−A`         |
| **Cash-in**, unpaid                           | She sends `A`; the customer will pay `A + F` later              | none yet              | `−A`         |
| **Cash-out**, paid (fee on top _or_ deducted) | Customer sends `A` by GCash; she hands over cash                | `−A + F`              | `+A`         |
| **Cash-out**, unpaid, fee on top              | She hands over `A` cash; the customer owes `A` (GCash) plus `F` | `−A`                  | none yet     |
| **Cash-out**, unpaid, fee deducted            | She hands over `A − F` cash; the customer owes `A` (GCash)      | `−(A − F)`            | none yet     |
| **Load**, paid                                | Customer pays `A + F`; the load is bought from GCash            | `+A + F`              | `−cost`\*    |
| **Load**, unpaid                              | Customer pays later                                             | none yet              | `−cost`\*    |
| **Water sale**, paid                          | Customer pays `gallons × price`                                 | `+total`              | none         |
| **Water delivery**                            | Supplier delivers gallons                                       | `−gallons × cost`\*\* | none         |

\* only when the setting **"Load is bought from my GCash wallet"** is on.
\*\* only when **"Water deliveries are paid from the cash drawer"** is on.

For a cash-out, "fee on top" and "fee deducted" leave her books **identical** (same profit, same drawer, same GCash). The only difference is how much cash she counts out, which the form tells her.

## 4. Unpaid entries (utang)

`src/lib/summary.ts` (`amountOwed`), `src/lib/utang.ts`, `src/db/queries.ts`

**Amount owed** on an unpaid entry:

| Entry                                               | Owed                                      |
| --------------------------------------------------- | ----------------------------------------- |
| Cash-in, load, water sale, cash-out with fee on top | `amount + fee` (water: `gallons × price`) |
| Cash-out with the fee deducted                      | `amount`                                  |

**Balance** = amount owed − payments received. A customer's balance is the sum over their unpaid entries. Customers are grouped by name, ignoring capital letters ("ana" and "Ana" are one customer). Different spellings are different customers.

**Payments**

- A payment records an amount, a date and a **method (cash or GCash)**. The default method is GCash when every entry it applies to is a cash-out (the customer owes a GCash transfer), and cash otherwise.
- A payment is applied to the customer's **oldest entries first**, or to **one chosen entry**. A payment cannot exceed the balance it is applied to.
- An entry becomes **paid** automatically when its payments cover what is owed.
- **Removing a payment** re-checks the entry. If it is no longer covered, it becomes unpaid again and returns to the Utang list.
- Payments never change sales or profit. Those were counted on the day of the entry.

**Locking.** An entry with any payments can only have its **name** changed, and it cannot be deleted. Otherwise an amount could be lowered below what has already been paid. Remove the payments first.

## 5. Sales and profit

`src/lib/summary.ts` (`summarize`, `profitOf`)

| Entry              | Profit                                | Counts toward Sales |
| ------------------ | ------------------------------------- | ------------------- |
| Cash-in / cash-out | the fee                               | the fee             |
| Load               | `amount + fee − cost`                 | `amount + fee`      |
| Water sale         | `gallons × (price − cost per gallon)` | `gallons × price`   |

- **Sales** = GCash fees + load sold + water sold. The money that passes through GCash belongs to the customers, so only the fees count as sales. It is shown separately as _GCash moved_.
- **Profit** is counted on the day the entry was made, **whether or not it has been paid**. Money still to be collected shows in the Utang total.
- Water sales store the cost per gallon **as it was on the day of the sale**, so changing the supplier price later never changes old profits.

## 6. Water stock

`getWaterStock` in `src/db/queries.ts`

**Water left** = gallons delivered − gallons sold (deleted entries ignored).

- A sale larger than the recorded stock shows a red warning but **still saves**, because the stock record might simply be out of date.
- Deleting or editing a delivery that would take the stock below zero shows a warning with the resulting number.
- If gallons are already at home when she starts, record them as a first delivery with a note.

## 7. Cash check

`src/lib/cashcheck.ts`, `day_closings` table, **Cash check** tab

The check compares what the records say she should have with what she counts.

1. **First use:** she enters her real cash and GCash balances. This is the _opening count_.
2. **Later:** `should have = last count's actual balance + movements since that count` (the movements come from the table in section 3, for entries and payments made after the last count was saved).
3. She enters the real balances. The app shows _Matches_, _Short ₱X_ or _Over ₱X_ for cash and GCash separately.
4. Saving a count (after a confirmation if there is a difference) makes it the new baseline. A mistake is therefore shown once and does not repeat every day.
5. The latest count can be deleted, which returns the baseline to the one before it.

Notes:

- Money received on utang counts when it is **received**, even for an old entry.
- An entry that has payments is treated as having been unpaid when it was created.
- The two settings from section 3 change the expected numbers for everything since the last count, so set them **before** the first count.

## 8. Day boundaries

The Today screen groups entries by calendar day in the phone's local time (midnight to midnight). New entries are always stamped with the current time, even while a past day is being viewed.

## 9. Settings reference

Stored in the `settings` table as text.

| Key                    | Meaning                                    | Default                 |
| ---------------------- | ------------------------------------------ | ----------------------- |
| `load_fee`             | Fee on small loads, centavos               | 500                     |
| `load_fee_threshold`   | Loads below this get the fee, centavos     | 10000                   |
| `load_cost_percent`    | Load cost as % of face value               | 100                     |
| `load_from_gcash`      | `1` if load comes out of the GCash wallet  | `1` on a new install    |
| `deliveries_from_cash` | `1` if deliveries are paid from the drawer | `1` on a new install    |
| `water_price`          | Selling price per gallon, centavos         | none (set by the owner) |
| `water_cost`           | Supplier cost per gallon, centavos         | none (set by the owner) |
| `theme_mode`           | `light`, `dark` or `system`                | `light`                 |
| `last_backup_at`       | Time of the last backup (ms since epoch)   | none                    |

---

## Worked examples (test vectors)

These are good first unit tests for `src/lib`.

### Fee lookup

| Amount  | Fee               |
| ------- | ----------------- |
| ₱100    | ₱5                |
| ₱101    | ₱10               |
| ₱2,000  | ₱40               |
| ₱2,001  | ₱50               |
| ₱10,000 | ₱200              |
| ₱10,001 | none (manual fee) |

### Day summary

Entries: cash-in ₱500 (fee ₱10, paid); cash-out ₱1,000 (fee ₱20, unpaid); cash-out ₱1,000 (fee ₱20, **deducted**, unpaid); load ₱50 (fee ₱5, paid, no cost recorded).

| Result                    | Value                    |
| ------------------------- | ------------------------ |
| GCash fees                | ₱50                      |
| Load sold                 | ₱55                      |
| **Sales**                 | **₱105**                 |
| **Profit**                | **₱55**                  |
| Owed on today's entries   | ₱2,020 (₱1,020 + ₱1,000) |
| Cash-in / cash-out volume | ₱500 / ₱2,000            |

### Utang with a chosen payment order

Ana owes: cash-out ₱1,000 fee ₱20 on top (₱1,020), then water 5 gal at ₱40 (₱200), then water 2 gal at ₱40 (₱80) as "ana". Total **₱1,300**, as one customer. She pays **₱1,100** with nothing chosen: the cash-out is cleared (₱1,020), the first water entry has ₱80 applied and ₱120 left, and the last is untouched. Balance **₱200**.

### Cash check

Settings: load not from GCash, deliveries not from the drawer. Opening count: cash ₱5,000, GCash ₱5,000.

| After                                                                                                                                           | Should have: cash | Should have: GCash |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------ |
| cash-in ₱500 (fee ₱10), cash-out ₱1,000 (fee ₱20, on top), cash-out ₱1,000 (fee ₱20, deducted), load ₱50 (fee ₱5), water 5 gal at ₱40, all paid | ₱3,805            | ₱6,500             |
| + Ana cash-out ₱1,000 (fee ₱20, on top), unpaid                                                                                                 | ₱2,805            | ₱6,500             |
| + Ana pays ₱1,020 by GCash                                                                                                                      | ₱2,805            | ₱7,520             |
| + Ben cash-in ₱300 (fee ₱10), unpaid                                                                                                            | ₱2,805            | ₱7,220             |
| + Ben pays ₱310 in cash                                                                                                                         | ₱3,115            | ₱7,220             |

---

## Known limitations

- **Fractional pesos can fall between fee tiers.** The tiers are defined as whole-peso ranges (for example ₱1–100 and ₱101–500), so an amount such as ₱100.50 matches neither. The form then asks for a manual fee. This is not expected with GCash cash-in/cash-out, which is normally in whole pesos.
- **Corrections to entries made before the last cash count are not reflected** in the expected balances. If an old entry is edited, the difference shows up at the next count.
- **Removing a payment deletes its record.** Entries are only hidden when deleted, but payment records have no deleted marker.
- **Names are matched by spelling** (ignoring case). "Ana" and "Anna" are two customers.
- **Left open past midnight,** the Today screen keeps the day it was showing until she moves the day picker or restarts the app.
- **One cash drawer.** Cash from GCash transactions and from water sales is treated as the same drawer.
