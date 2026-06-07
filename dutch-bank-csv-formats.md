# Dutch Bank CSV Export Formats — Research Reference

> Last updated: 2026-06-06  
> Purpose: Implementation reference for extending Lumen's CSV import to support major Dutch banks beyond Revolut.

---

## Quick Comparison Table

| Bank | Delimiter | Date Format | Has Headers | Amount Sign | History | Notes |
|------|-----------|-------------|-------------|-------------|---------|-------|
| Revolut ✅ | Comma | `YYYY-MM-DD HH:MM:SS` | Yes | Signed | Unlimited | Already implemented |
| ING | Comma | `YYYYMMDD` | Yes | Unsigned + Af/Bij col | 18 months | Most popular NL bank |
| ABN AMRO | Tab | `YYYYMMDD` | **No** | Signed | 18 months | TXT file, no CSV for current accounts |
| Rabobank | Comma | `YYYY-MM-DD` | Yes | Signed | 8 years | 26-column format |
| Knab | Comma | `DD-MM-YYYY` | Yes | Unsigned + C/D col | 24 months | Max 2000 rows per file |
| ASN Bank | Comma | `DD-MM-YYYY` | **No** | Signed | Multiple years | Two variants (IBAN / CSV2004) |
| SNS Bank | Comma | Unknown | Yes | Unknown | 5 years | CAMT.053 preferred |
| Triodos | Semicolon | `DD-MM-YYYY` | Yes | Signed | Unknown | 8-column format |
| bunq | Comma / Semicolon | Unknown | Yes | Signed | Any period | Regional format switch |
| N26 | Comma | Unknown | Yes | Signed | Unknown | Format changed July 2024 |

---

## Revolut (already implemented)

**File**: `account-statement_*.csv`  
**Delimiter**: Comma `,`  
**Encoding**: UTF-8  
**Date format**: `YYYY-MM-DD HH:MM:SS`  
**Headers**: Yes  
**Amount**: Signed (negative = debit)

| Column | DB Field | Notes |
|--------|----------|-------|
| `Type` | `type` | e.g. CARD_PAYMENT, TRANSFER |
| `Product` | — | e.g. Current |
| `Started Date` | `started_at` | Datetime |
| `Completed Date` | `completed_at` | Datetime |
| `Description` | `description` | Merchant / transfer note |
| `Amount` | `amount` | Negative = spend |
| `Fee` | `fee` | Usually 0.00 |
| `Currency` | `currency` | ISO 4217 |
| `State` | `state` | COMPLETED, PENDING, REVERTED |
| `Balance` | `balance` | After-transaction balance |

---

## ING Bank Netherlands

**Market share**: ~35% — largest Dutch retail bank.  
**Export path**: Mijn ING → Betaalrekening → "Af- en bijschrijvingen downloaden" → "Kommagescheiden CSV"  
**Delimiter**: Comma `,`  
**Encoding**: Unknown (likely UTF-8 or Windows-1252)  
**Date format**: `YYYYMMDD` (no separators)  
**Headers**: Yes  
**Amount**: Always positive; use `Af Bij` column for direction  
**Available history**: 18 months online; older via paper statement request

| # | Column | Example | Notes |
|---|--------|---------|-------|
| 0 | `Datum` | `20240315` | YYYYMMDD |
| 1 | `Naam / Omschrijving` | `Albert Heijn 1234` | Counterparty name or merchant |
| 2 | `Rekening` | `NL91INGB0001234567` | Own account IBAN |
| 3 | `Tegenrekening` | `NL55INGB0000123456` | Counterparty IBAN (empty for card) |
| 4 | `Code` | `BA` | Mutation code: BA=ATM, GT=Giro, IC=iDEAL, OV=Transfer, etc. |
| 5 | `Af Bij` | `Af` | `Af` = debit, `Bij` = credit |
| 6 | `Bedrag (EUR)` | `42,50` | Always positive, comma decimal |
| 7 | `MutatieSoort` | `Betaalautomaat` | Human-readable type |
| 8 | `Mededelingen` | `Groceries AH` | Free-text description / payment reference |

**Parsing notes**:
- Amount is always positive; negate when `Af Bij == "Af"`
- Decimal separator is comma (Dutch locale) — replace `,` → `.` before parsing
- `Code` values: `BA` (ATM/POS), `GT` (Giro/bank transfer), `IC` (iDEAL), `OV` (Overschrijving), `DV` (Divers), `GF` (Phone banking), `ST` (Salary/pension), `VZ` (Collection)
- ING also offers MT940 and CAMT.053 (preferred for accounting software)

---

## ABN AMRO Netherlands

**Market share**: ~25% — second largest.  
**Export path**: Online Banking → account → Download transactions → TXT or Excel  
**Format**: Tab-separated TXT (**no CSV for current accounts**; CSV only for Business Card)  
**File naming**: `TXT%y%m%d%H%M%S.TAB` (e.g. `TXT231122235959.TAB`)  
**Delimiter**: Tab `\t`  
**Encoding**: Unknown  
**Date format**: `YYYYMMDD`  
**Headers**: **No headers** — positional only  
**Amount**: Signed (negative = debit)  
**Available history**: 18 months

| # | Field | Example | Notes |
|---|-------|---------|-------|
| 0 | Account number | `123456789` | Own account (not IBAN, legacy format) |
| 1 | Currency | `EUR` | ISO 4217 |
| 2 | Transaction date | `20240315` | YYYYMMDD |
| 3 | Balance before | `1250,00` | Opening balance |
| 4 | Balance after | `1207,50` | Closing balance |
| 5 | Transaction date (2) | `20240315` | Interest/value date |
| 6 | Amount | `-42,50` | Signed, comma decimal |
| 7 | Description | `Albert Heijn /BA` | Free text; may contain counterparty info |

**Parsing notes**:
- No headers — parse purely by position
- ABN AMRO also exports XLS (Excel) with the same columns in different order
- Description field is a single long text blob — merchant name and reference are concatenated
- ABN AMRO recommends MT940 or CAMT.053 for structured data
- The XLS format has cleaner named columns; consider requesting XLS if parsing TXT is fragile

---

## Rabobank Netherlands

**Market share**: ~25% — cooperative bank, strong agricultural/SME base.  
**Export path**: Rabo Online Banking → account → Download → CSV  
**Delimiter**: Comma `,`  
**Encoding**: UTF-8  
**Date format**: `YYYY-MM-DD` (ISO 8601)  
**Headers**: Yes  
**Amount**: Signed (negative = debit)  
**Available history**: 8 years (account statements)

| # | Column | Example | Notes |
|---|--------|---------|-------|
| 0 | `IBAN/BBAN` | `NL44RABO0123456789` | Own account |
| 1 | `Munt` | `EUR` | Currency |
| 2 | `BIC` | `RABONL2U` | Own BIC |
| 3 | `Volgnr` | `2024001234` | Internal sequence number — good dedup key |
| 4 | `Datum` | `2024-03-15` | Transaction date (YYYY-MM-DD) |
| 5 | `Rentedatum` | `2024-03-15` | Interest/value date |
| 6 | `Bedrag` | `-42.50` | Signed amount, dot decimal |
| 7 | `Saldo na trn` | `1207.50` | Balance after transaction |
| 8 | `Tegenpartij IBAN` | `NL91INGB0001234567` | Counterparty IBAN |
| 9 | `Naam tegenpartij` | `Albert Heijn B.V.` | Counterparty name |
| 10 | `Naam uiteindelijke partij` | `` | Ultimate party (SEPA) |
| 11 | `Naam initiërende partij` | `` | Initiating party (SEPA) |
| 12 | `BIC tegenpartij` | `INGBNL2A` | Counterparty BIC |
| 13 | `Code` | `64` | Transaction type code |
| 14 | `Batch ID` | `` | SEPA batch reference |
| 15 | `Transactiereferentie` | `NOTPROVIDED` | SEPA CT ID |
| 16 | `Machtigingsnummer` | `` | Direct debit mandate number |
| 17 | `Incassant ID` | `` | Creditor/incasso ID |
| 18 | `Betalingskenmerk` | `REF20240315001` | Payment reference (kenmerk) |
| 19 | `Omschrijving-1` | `Groceries` | Description line 1 |
| 20 | `Omschrijving-2` | `` | Description line 2 |
| 21 | `Omschrijving-3` | `` | Description line 3 |
| 22 | `Reden retour` | `` | Return reason code |
| 23 | `Oorspr bedrag` | `` | Original amount (FX transactions) |
| 24 | `Oorspr munt` | `` | Original currency |
| 25 | `Koers` | `` | Exchange rate |

**Parsing notes**:
- Amount uses dot decimal (not comma) — unusual for Dutch locale
- Concatenate `Omschrijving-1` + `-2` + `-3` for full description
- `Volgnr` (col 3) is a reliable dedup key — use it
- Also available in MT940 Structured (`.swi`) format

---

## Knab Bank

**Market share**: Small but popular with freelancers and entrepreneurs.  
**Export path**: Knab Online → account → Zoeken en downloaden → Downloaden → CSV  
**Delimiter**: Comma `,`  
**Encoding**: Unknown  
**Date format**: `DD-MM-YYYY`  
**Headers**: Yes  
**Amount**: Unsigned + `CreditDebet` column (C/D)  
**Max per file**: 2000 transactions  
**Available history**: 24 months

| # | Column | Example | Notes |
|---|--------|---------|-------|
| 0 | `Rekeningnummer` | `NL34KNAB0000012345` | Own account IBAN |
| 1 | `Transactiedatum` | `15-03-2024` | DD-MM-YYYY |
| 2 | `Valutacode` | `EUR` | Currency |
| 3 | `CreditDebet` | `D` | `C` = credit (income), `D` = debit (spend) |
| 4 | `Bedrag` | `42,50` | Always positive, comma decimal |
| 5 | `Tegenrekeningnummer` | `NL91INGB0001234567` | Counterparty IBAN |
| 6 | `Tegenrekeninghouder` | `Albert Heijn B.V.` | Counterparty name |
| 7 | `Valutadatum` | `15-03-2024` | Value date |
| 8 | `Betaalwijze` | `Betaalpas` | Payment method |
| 9 | `Omschrijving` | `AH Groceries` | Description |
| 10 | `Type betaling` | `Chipknip` | Payment type |
| 11 | `Machtigingsnummer` | `` | SEPA direct debit mandate |
| 12 | `Incassant ID` | `` | Creditor ID |
| 13 | `Adres` | `` | Address |
| 14 | `Referentie` | `` | Payment reference |
| 15 | `Boekdatum` | `15-03-2024` | Booking date |

**Parsing notes**:
- Negate when `CreditDebet == "D"`
- Both `Transactiedatum` and `Boekdatum` present — use `Boekdatum` as primary
- 2000-row limit means multi-file uploads needed for heavy users

---

## ASN Bank

**Market share**: Small, popular with sustainability-focused customers.  
**Export path**: ASN Online Bankieren → download as CSV  
**Delimiter**: Comma `,`  
**Encoding**: Unknown  
**Date format**: `DD-MM-YYYY`  
**Headers**: **No headers** — positional only  
**Amount**: Signed (negative = debit)  
**File variants**:
- Standard CSV (with IBAN)
- CSV2004 (same columns but all fields quoted with `"`)
**File naming**: Last 10 digits of IBAN + journal date + sequence number

| # | Field | Example | Notes |
|---|-------|---------|-------|
| 0 | Booking date | `15-03-2024` | DD-MM-YYYY |
| 1 | (unknown) | | |
| 2 | Counterparty account | `NL91INGB0001234567` | Counterparty IBAN |
| 3 | Counterparty name | `Albert Heijn` | |
| 4–6 | (unknown) | | |
| 7 | Currency | `EUR` | Always EUR for NL |
| 8 | (unknown) | | |
| 9 | (currency validation) | `EUR` | |
| 10 | Amount | `-42.50` | Signed |
| 11–13 | (unknown) | | |
| 14 | Transaction code | `BA` | |
| 15 | (unknown) | | |
| 16 | Payment reference | `REF123` | |
| 17 | Description | `Groceries AH` | |
| 18 | (unknown) | | |

**Total columns**: 19  
**Parsing notes**:
- No headers — must detect by column count (19) to identify format
- Two variants differ only in quoting; parse both with a CSV library with flexible quote settings
- Columns 1, 4-6, 8, 11-13, 15, 18 are undocumented in public sources — treat as opaque

---

## SNS Bank (Volksbank)

**Market share**: Small-medium; includes RegioBank under Volksbank umbrella.  
**Export path**: Mijn SNS → transactions → download → CSV  
**Delimiter**: Comma `,` (likely; uses "Kommagescheiden CSV" label)  
**Date format**: Unknown (likely `DD-MM-YYYY`)  
**Headers**: Yes  
**Amount**: Unknown sign convention  
**Available history**: 5 years  
**Notes**: MT940 export **discontinued July 15, 2022**. CSV and CAMT.053 remain.

**Known columns** (partial, from Dutch accounting forums):
- `Boekdatum` — Booking date
- `Bedrag` — Amount
- `Naam tegenrekening` — Counterparty name
- `Verwerkingsdatum` — Processing date
- `Volgnummer` — Sequence number (unique per transaction)

**Parsing notes**:
- Column headers are partially documented publicly; a real sample file is needed for full mapping
- CAMT.053 (XML) is the more reliable format if CSV proves inconsistent
- RegioBank (same parent, Volksbank) likely shares the same CSV format

---

## Triodos Bank Netherlands

**Market share**: Very small; niche ethical bank.  
**Export path**: Triodos Online Banking → download CSV  
**Delimiter**: Semicolon `;`  
**Encoding**: Unknown  
**Date format**: `DD-MM-YYYY`  
**Headers**: Yes  
**Amount**: Signed (separate debit/credit indicator column too)  
**Total columns**: 8

| # | Field | Example | Notes |
|---|-------|---------|-------|
| 0 | Booking date | `15-03-2024` | DD-MM-YYYY |
| 1 | (unknown) | | Possibly own account |
| 2 | Amount | `-42.50` | Signed |
| 3 | Debit/Credit | `D` | `D` or `C` |
| 4 | Counterparty name | `Albert Heijn` | |
| 5 | Counterparty account | `NL91INGB0001234567` | |
| 6 | Transaction type code | `OV` | |
| 7 | Description | `Groceries` | |

**Parsing notes**:
- Semicolon delimiter is unusual among Dutch banks — detect before parsing
- 8 columns is the smallest format; simplest to parse
- Small user base; lower priority for implementation

---

## bunq

**Market share**: Small but growing; popular with expats and tech-savvy users.  
**Export path**: bunq app or web → account → Export statement → CSV  
**Delimiter**: **Regional variant** — Comma `,` (UK/US) or Semicolon `;` (European)  
**Date format**: Unknown  
**Headers**: Yes  
**Amount**: Signed  
**Available history**: Any period (no limit mentioned)

**Known columns** (from community reports, not officially documented):
- Date
- Amount
- Account (own)
- Counterparty name
- Description / note
- (Additional columns may vary by account type)

**Parsing notes**:
- Must auto-detect delimiter (comma vs. semicolon) since users can export in either format
- Column names are not officially published; a real sample file is the only reliable source
- bunq API provides structured JSON exports which are far more reliable than CSV for integrations
- Business accounts may have different column sets than personal accounts

---

## N26

**Market share**: Small in NL; operates across EU.  
**Export path**: N26 WebApp only (not mobile app) → account → Downloads → CSV  
**Delimiter**: Comma `,`  
**Encoding**: UTF-8  
**Date format**: Unknown  
**Headers**: Yes  
**Amount**: Signed (negative = debit)

**Column history**:
- **Pre-July 2024**: included a `Category` column (auto-categorized by N26)
- **Post-July 2024**: `Category` column removed

**Known columns (post-July 2024)**:
- `Booking Date`
- `Value Date`
- `Partner Name` — counterparty
- `Partner Account` — counterparty IBAN
- `Transaction Type`
- `Payment Reference`
- `Account Name`
- `Amount (EUR)`
- `Original Amount`
- `Original Currency`
- `Exchange Rate`

**Parsing notes**:
- Export only available from web app; no mobile export
- Column names are in English regardless of account language setting
- Format changed July 2024; any pre-existing parser may be broken
- `Transaction Type` values include: `MasterCard Payment`, `Outgoing Transfer`, `Incoming Transfer`, `Direct Debit`

---

## Implementation Priority

Based on market share and format complexity:

| Priority | Bank | Reason |
|----------|------|--------|
| 1 | **ING** | ~35% market share, well-documented format, comma-separated with headers |
| 2 | **Rabobank** | ~25% market share, clean ISO date, well-documented 26-column format |
| 3 | **ABN AMRO** | ~25% market share, but tricky (tab-delimited TXT, no headers) |
| 4 | **Knab** | Growing, popular with freelancers who are likely to use a budgeting app |
| 5 | **N26** | Popular with expats and tech users; English column names (easy to parse) |
| 6 | **bunq** | Growing neobank; delimiter ambiguity complicates parsing |
| 7 | **ASN** | Small but loyal base; no-header format needs positional parsing |
| 8 | **SNS** | Medium size but column spec is incomplete publicly |
| 9 | **Triodos** | Very small; semicolon delimiter easy to handle |

---

## Parser Architecture Recommendations

### Detection strategy (auto-detect bank from file)
1. Check delimiter (semicolon → Triodos; tab → ABN AMRO TXT)
2. Check row width (8 cols → Triodos; 9 cols → ING; 16 cols → Knab; 26 cols → Rabobank; 19 cols → ASN)
3. Check header names (ING: `Af Bij`; Rabobank: `Volgnr`; Knab: `CreditDebet`; N26: `Partner Name`)
4. Check date format in first data row (YYYYMMDD → ING/ABN AMRO; YYYY-MM-DD → Rabobank; DD-MM-YYYY → Knab/ASN/Triodos)
5. Fallback: ask user to confirm bank

### Normalisation target
All parsers should produce the same normalised row:
```ts
interface NormalisedRow {
  date: string          // ISO 8601: YYYY-MM-DD
  description: string   // best available merchant/note text
  amount: number        // signed float, negative = debit, EUR
  currency: string      // ISO 4217, default 'EUR'
  type: string          // normalised type string
  counterparty_name?: string
  counterparty_iban?: string
  reference?: string
  raw: Record<string, string>  // original row for debugging
}
```

### Decimal handling
- ING, Knab: comma decimal (`42,50`) → replace `,` with `.`
- Rabobank: dot decimal (`42.50`) → parse directly
- ABN AMRO: comma decimal (`42,50`) → replace
- ASN, Triodos, SNS, bunq, N26: verify per sample file

---

## Sources

- [ING export files — Yuki Support](https://support.yuki.nl/en/support/solutions/articles/80000787467-ing-bank-export-files)
- [ABN AMRO export files — Yuki Support](https://support.yuki.nl/en/support/solutions/articles/80000786206-abn-amro-nederland-export-files)
- [Rabobank CSV format — Firefly III import config](https://github.com/firefly-iii/import-configurations/blob/main/nl/rabobank/rabobank-new-csv-format.json)
- [Dutch banks transaction download overview — Spreadsheet Shop NL](https://spreadsheet-shop.nl/blogs/extra-uitleg-bij-boekhouden-in-sheets/banktransacties-downloaden-doe-je-zo-alle-nederlandse-banken)
- [ABN AMRO statement parser (column positions)](https://github.com/denilsonsa/abn-amro-statement-parser)
- [HomeBankCSV — ING/ASN/Triodos column parsing](https://github.com/cwverhey/HomeBankCSV)
- [Knab bank export files — Yuki Support](https://support.yuki.nl/en/support/solutions/articles/80000786199-knab-bank-export-files)
- [ASN Bank file format specification (official PDF)](https://www.asnbank.nl/web/file?uuid=fc28db9c-d91e-4a2c-bd3a-30cffb057e8b&owner=6916ad14-918d-4ea8-80ac-f71f0ff1928e&contentid=852)
- [SNS Bank transaction overview explanation](https://www.snsbank.nl/particulier/support/download-tonen-op-pagina/uitleg-van-je-transactieoverzicht-in-mijn-sns.html)
- [bunq export format (community thread)](https://together.bunq.com/d/31899-how-do-i-create-a-csv-export)
- [N26 CSV format change July 2024](https://github.com/agespido/n26_expense_tracker)
- [beancount-n26 (N26 CSV columns)](https://github.com/siddhantgoel/beancount-n26)
- [ofxstatement-dutch (ING/KNAB/ASN)](https://pypi.org/project/ofxstatement-dutch/)
- [N26 statement export guide](https://betterbankstatements.com/guides/export-n26-bank-statements)
