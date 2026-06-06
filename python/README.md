# Python — Categorization Microservice

ML-based transaction categorization. Called by the Next.js backend via HTTP when rule-based matching in `lumen/lib/categorizer.ts` returns `"Uncategorized"`.

## Planned endpoint

```
POST /categorize
Body: { "transactions": [{ "description": "...", "amount": -12.50 }] }
Response: { "categories": ["Groceries"] }
```

## Model approach

Trained offline on a 1M-row synthetic Dutch transaction dataset with rich features (MCC codes, entry_method, card_location, merchant_country). At inference time only `description` and `amount` are used — no enrichment.

## Setup (coming soon)

```bash
pip install -r requirements.txt
python app.py
```
