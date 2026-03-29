# Software and Data Map

## Contents

- 1. Source-system priority
- 2. MISA expectations
- 3. SAP expectations
- 4. Excel and manual packs
- 5. F&B data-source crosswalk
- 6. Stable analytical schema

## 1. Source-system priority

- Treat the posted ledger or statutory accounting export as the base book unless the task is explicitly operational.
- Use operational systems to explain variances, not to overwrite ledger reality without a documented adjustment.
- Preserve source lineage:
  - system name
  - report name
  - period
  - filters
  - export timestamp

## 2. MISA expectations

- Common useful exports:
  - general journal or nhật ký chung
  - sổ cái or ledger detail by account
  - trial balance or cân đối số phát sinh
  - AP and AR detail
  - inventory card, warehouse movement, item master
  - invoice listing and VAT schedules
  - fixed asset and depreciation reports
- Common risks in MISA-driven environments:
  - branch or store dimensions used inconsistently
  - inventory items duplicated by spelling or UOM
  - VAT rate selection errors
  - postings imported from Excel without strong validation
  - late supporting documents causing backdated edits
- Ask for these identifiers whenever possible:
  - document number
  - posting date
  - account code
  - customer or supplier code
  - item code
  - warehouse
  - branch or store
  - tax code or VAT rate

## 3. SAP expectations

- Think in modules even when the client gives only flat exports:
  - FI for GL, AP, AR, bank, fixed assets
  - MM for purchasing, goods receipt, stock movement
  - SD or POS interfaces for sales and customer billing
  - CO for cost center, profit center, internal order, COPA-style views
- Common useful SAP reports or export families vary by implementation, but often include:
  - GL line items
  - vendor and customer open items
  - stock movement
  - stock balance by location
  - invoice verification
  - cost center actuals
  - profitability or segment reporting
- Common SAP risks:
  - incorrect posting key or account determination
  - tax code misassignment
  - blocked or parked documents not considered in close
  - differences between goods receipt, invoice receipt, and payment timing
  - store interfaces posting to suspense accounts without timely clearance
- Ask for dimensions explicitly:
  - company code
  - profit center
  - cost center
  - plant
  - storage location
  - vendor or customer
  - material
  - tax code

## 4. Excel and manual packs

- Expect Excel to be the bridge layer for:
  - store sales summaries
  - delivery-platform statements
  - physical count sheets
  - payroll support
  - accrual schedules
  - management packs
- Stabilize Excel sources before analysis:
  - standardize headers
  - convert text dates
  - normalize store or branch codes
  - isolate merged-header ranges into flat tables
- Never treat a manually prepared Excel summary as conclusive if raw support exists and conflicts with it.

## 5. F&B data-source crosswalk

| Source                          | Typical role                                        | Common reconciliation target               |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| POS / OMS                       | Order volume, bill value, voids, discounts, refunds | Sales journal and revenue by channel       |
| Delivery app statement          | Gross sales, commission, vouchers, settlement       | Platform receivable and commission expense |
| Payment gateway / merchant file | Card settlement and fees                            | Bank reconciliation and clearing accounts  |
| Warehouse / inventory export    | Item movement and stock on hand                     | Inventory balance and COGS                 |
| Recipe / BOM file               | Theoretical usage                                   | Margin analysis and waste investigation    |
| Payroll register                | Salary and deductions                               | Payroll expense and liabilities            |
| Supplier invoice pack           | Goods and service support                           | AP and expense accruals                    |
| Bank statement                  | Cash movement                                       | Bank reconciliation and settlement timing  |

## 6. Stable analytical schema

Map local headers into this schema when possible:

| Canonical field | Example local headers                       |
| --------------- | ------------------------------------------- |
| posting_date    | ngày hạch toán, posting date, document date |
| document_no     | số chứng từ, voucher no, ref no             |
| description     | diễn giải, narration, text                  |
| gl_account      | tài khoản, account, G/L account             |
| debit           | nợ, debit amount                            |
| credit          | có, credit amount                           |
| amount          | số tiền, amount, value                      |
| tax_code        | mã thuế, VAT code, tax code                 |
| branch          | chi nhánh, store, outlet                    |
| warehouse       | kho, warehouse, location                    |
| item_code       | mã hàng, material, SKU                      |
| quantity        | số lượng, qty                               |
| unit_cost       | giá vốn đơn vị, unit cost                   |
| vendor          | nhà cung cấp, vendor                        |
| customer        | khách hàng, customer                        |

When fields are missing, say exactly which source must be requested next instead of guessing.
