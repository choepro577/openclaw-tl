# KPI and Risk Flags

## Contents

- 1. Core KPIs
- 2. Analytical questions
- 3. Red flags
- 4. Control failures to test

## 1. Core KPIs

Track these by entity, store, and channel whenever data allows:

| KPI                         | Why it matters                                            |
| --------------------------- | --------------------------------------------------------- |
| Revenue per store-day       | Detect operational underperformance and cutoff issues     |
| Average check               | Expose mix shifts, pricing, or discount leakage           |
| COGS percent                | Core indicator of recipe, waste, pricing, or theft issues |
| Gross margin percent        | Early warning for mix, pricing, or cost problems          |
| Labor percent               | Signals scheduling or productivity stress                 |
| Prime cost percent          | Combined food plus labor pressure                         |
| Delivery commission percent | Detect platform economics drift                           |
| Void or refund percent      | Control and fraud indicator                               |
| Inventory days on hand      | Identify overbuying or stale stock                        |
| Stock adjustment percent    | Control quality indicator                                 |
| AP aging over policy        | Signals cash strain or process issues                     |
| Cash over or short          | Store-level cash control quality                          |

## 2. Analytical questions

- Is the margin change explained by sales mix, recipe cost, supplier price, or waste?
- Are discounts and complimentary items rising faster than traffic?
- Are platform fees or settlement delays increasing without matching revenue growth?
- Are stock adjustments concentrated in certain stores, users, or items?
- Does labor cost move with sales volume, or is scheduling inefficient?
- Are month-end journals doing too much of the real work that operations should have posted earlier?

## 3. Red flags

- Sales grow but bank settlement or receivables do not move consistently.
- Negative inventory persists across multiple periods.
- Same SKU appears under multiple names or UOMs.
- Delivery-platform deposits are posted net with no visibility into gross sales and commissions.
- Large round-number journals appear on the last day of the month with vague descriptions.
- Excessive voids, refunds, or complimentary items cluster around certain stores, cashiers, or periods.
- AP balances remain old while supplier activity continues.
- COGS percent jumps without a matching mix shift, supplier price change, or waste event.
- Repeated backdated edits occur after the soft close.

## 4. Control failures to test

- No formal cutoff for store, warehouse, or accounting postings.
- No monthly reconciliation between POS and accounting revenue.
- No owner for merchant-settlement clearing accounts.
- No independent review of stock adjustments and inventory write-offs.
- No bridge between HR roster, attendance, and payroll register.
- No audit trail linking VAT invoices to sales by channel.
- No approval matrix for manual journals, discounts, complimentary items, or supplier master changes.

Use KPI outliers to decide where to read deeper, but do not treat a KPI breach as proof until ledger and source evidence agree.
