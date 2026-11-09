# Lumen categoriser service

FastAPI service wrapping the transaction classifier. During import, the Next.js ingest route first applies the keyword rules (`lib/categorizer.ts`), then sends every row here. The model's prediction replaces the rule result when its softmax confidence is at least `CATEGORIZER_CONFIDENCE_THRESHOLD` (default 0.45). If the service is down, the import still succeeds with rule-based categories only.

## Model

- **Embedder:** `BAAI/bge-m3`, 1024-dimensional, applied to the transaction description.
- **Extra features (7):** amount, `log1p(|amount|)`, an is-debit flag, and sin/cos encodings of day-of-week and month.
- **Classifier:** MLP 1031 → 512 → 256 → 41, with GELU, LayerNorm and dropout 0.1 (see `model.py`).
- **Checkpoint:** `params.pt`.

## Setup

From `lumen/`:

```bash
python -m venv services/categorizer/.venv
source services/categorizer/.venv/bin/activate      # Windows: services\categorizer\.venv\Scripts\Activate.ps1
pip install -r services/categorizer/requirements.txt
npm run categorizer                                  # serves on http://127.0.0.1:8001
```

The first request downloads and loads BGE-M3, which takes a while. Later requests are fast.

## API

`POST /predict`

```json
{ "transactions": [{ "description": "Albert Heijn", "amount": -12.45, "completed_date": "2024-11-01" }], "top_k": 1 }
```

The response is `{ "predictions": [{ "category": "...", "confidence": 0.93 }] }`. With `top_k: 3` each prediction also carries a `top3` list.

The service has no authentication. Keep it bound to localhost.
