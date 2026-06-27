# Lumen Categorizer Service

Local Python service for the transaction classifier. Next.js calls this during CSV import after the rule-based categorizer has had the first pass.

## Setup

```powershell
cd C:\Users\andre\OneDrive\Desktop\DelftHack\lumen
python -m venv services\categorizer\.venv
services\categorizer\.venv\Scripts\Activate.ps1
pip install -r services\categorizer\requirements.txt
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-m3')"
```

## Run

```powershell
npm run categorizer
```

The service listens on `http://127.0.0.1:8001` by default. Override it in Next.js with:

```env
CATEGORIZER_URL=http://127.0.0.1:8001
CATEGORIZER_CONFIDENCE_THRESHOLD=0.45
```

The service expects its checkpoint at `services/categorizer/params.pt` by default.
The current checkpoint is the newer `time.pt` model installed under that stable
filename so existing scripts and server environment variables keep working. When
Next.js imports Revolut rows it sends `description`, `amount`, and
`completed_date`; direct classifier calls can still use `[name]` or
`[name, amount]` for backwards compatibility.

The first prediction loads BGE-M3 into memory and can take a few seconds. Later requests should be fast.
