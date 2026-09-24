# Run the Viva Demo

Open three terminals from the repository root.

## 1. Python parser

```bash
cd backend-parser
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## 2. Node API

```bash
cd backend-api
npm install
USE_MOCK_DB=true PORT=3050 npm start
```

Gemini is optional. To enable evidence-grounded natural-language answers, add a server-side key before starting Node:

```bash
export GEMINI_API_KEY="your-key"
export GEMINI_MODEL="gemini-3.8-flash"
```

Never place the key in the React frontend or commit it to Git. Without a key, the same endpoint returns a clearly labelled evidence-only fallback.

## 3. React frontend

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. It starts in the clearly labelled sample-data mode. Switch once to **Live Services Mode**, then upload `backend-api/sample_contract.pdf`.

If the sample PDF is missing, generate it with:

```bash
backend-parser/.venv/bin/python backend-parser/generate_demo_pdf.py
```

## Demo questions

1. `What are the exclusions from protection?`
2. `Is Schedule B attached and what does it require?`

The second query must show a backend-derived missing-evidence abstention.

## Run verification

```bash
cd backend-parser
.venv/bin/python test_service.py

cd ../backend-api
USE_MOCK_DB=true npm test
PYTHON_BIN="$(cd ../backend-parser && pwd)/.venv/bin/python" USE_MOCK_DB=true npm run test:e2e

cd ../frontend
npm run build
```
