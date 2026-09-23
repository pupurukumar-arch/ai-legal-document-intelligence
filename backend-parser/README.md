# Backend Parser Microservice
### AI Legal Document Intelligence Platform

High-performance legal document parsing microservice built with **Python 3.11+** and **FastAPI**. 

Unlike generic RAG pipelines that arbitrarily chop text into fixed token windows (e.g. 512 tokens), this microservice uses **PyMuPDF (`fitz`)** to execute **Structural Layout Chunking**. It extracts text bounded by contractual legal hierarchy (**Article**, **Section**, **Clause**, **Recitals**, and **Schedules**) and detects cross-references across clauses.

---

## 🏛️ Why Structural Hierarchy Chunking?

| Feature | Naive Token Splitting (e.g. LangChain RecursiveCharacter) | Our Structural Layout Chunking |
|---|---|---|
| **Semantic Integrity** | Slices sentences and definitions in half at token count 512 | Preserves complete clauses with boundaries intact |
| **Legal Context** | Loses parent section numbers & article titles | Tracks `clause_id` (e.g. `SEC-1.1`) and `section_title` |
| **Cross-References** | References like "Schedule A" separated from context | Automatically extracts and tags cross-references per clause |
| **Citation Accuracy** | Approximate page mapping | Pinpoints exact starting `page_number` (1-indexed) |

---

## 📂 Directory Structure

```text
backend-parser/
├── requirements.txt         # fastapi, uvicorn, pymupdf, python-multipart, pydantic
├── main.py                  # FastAPI application with POST /parse-pdf & healthcheck
├── models.py                # Pydantic v2 schemas for request & structured responses
├── parser.py                # PyMuPDF legal hierarchy layout & cross-reference engine
├── test_service.py          # Synthetic PDF generator & comprehensive test suite
└── README.md                # Microservice documentation
```

---

## 🚀 Quickstart

### 1. Installation
Install the required dependencies:
```bash
python -m pip install -r backend-parser/requirements.txt
```

### 2. Run the Service
Start the FastAPI server via Uvicorn:
```bash
# Option A: From workspace root
python -m uvicorn backend-parser.main:app --reload --host 0.0.0.0 --port 8000

# Option B: Run directly
python backend-parser/main.py
```

- Interactive Swagger Docs: `http://localhost:8000/docs`
- ReDoc Docs: `http://localhost:8000/redoc`
- Health Check: `http://localhost:8000/health`

### 3. Run the Automated Tests
Run the built-in test suite (generates a synthetic legal contract PDF, tests chunking, cross-references, and API routes):
```bash
python backend-parser/test_service.py
```

---

## 📡 API Specification

### `POST /parse-pdf`
Uploads a contract PDF and returns structurally chunked clauses with legal hierarchy and cross-references.

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: PDF binary file (e.g. `contract.pdf`)

#### cURL Example
```bash
curl -X POST "http://localhost:8000/parse-pdf" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/contract.pdf;type=application/pdf"
```

#### Response Example
```json
{
  "success": true,
  "metadata": {
    "filename": "sample_contract.pdf",
    "total_pages": 4,
    "total_clauses": 12,
    "processing_time_ms": 28.4
  },
  "clauses": [
    {
      "clause_id": "PREAMBLE",
      "section_title": "Preamble & Recitals",
      "page_number": 1,
      "content": "MASTER SERVICES AGREEMENT\nThis Agreement is entered into as of October 1, 2025...",
      "cross_references": []
    },
    {
      "clause_id": "SEC-1.1",
      "section_title": "Confidential Information",
      "page_number": 1,
      "content": "Confidential Information refers to all proprietary data disclosed under this Agreement...",
      "cross_references": []
    },
    {
      "clause_id": "SEC-1.2",
      "section_title": "Exclusions from Protection",
      "page_number": 1,
      "content": "The confidentiality obligations under Section 1.1 shall not apply to materials listed under Schedule A.",
      "cross_references": [
        "Section 1.1",
        "Schedule A"
      ]
    },
    {
      "clause_id": "SEC-2.1",
      "section_title": "Non-Disclosure Duty",
      "page_number": 2,
      "content": "The Recipient agrees to hold all Confidential Information in strict confidence, subject to Exhibit B and Section 1.1.",
      "cross_references": [
        "Exhibit B",
        "Section 1.1"
      ]
    },
    {
      "clause_id": "CLAUSE-3.1",
      "section_title": "Duration",
      "page_number": 2,
      "content": "This Agreement continues for two (2) years, unless terminated earlier pursuant to Section 2.1 or Article 2.",
      "cross_references": [
        "Section 2.1",
        "Article 2"
      ]
    },
    {
      "clause_id": "SCHED-A",
      "section_title": "SCHEDULE A - EXCLUDED ASSETS",
      "page_number": 2,
      "content": "1. Public domain specifications and open-source documentation.\n2. Independent third-party reports.",
      "cross_references": []
    }
  ]
}
```

---

## 🔍 Structural Parsing Logic

1. **Reading & Layout Flow**: PyMuPDF extracts text blocks and coordinates. Block sequencing naturally preserves multi-column and single-column top-down reading flow.
2. **Hierarchy Detection**:
   - `ART-[ID]`: Matched from `ARTICLE [IVXLCDM\d]+` (e.g. `ARTICLE 1`, `ARTICLE II`)
   - `SEC-[ID]`: Matched from `SECTION [0-9]+(\.[0-9]+)*` or `[0-9]+\.[0-9]+` (e.g. `1.1 Confidential Information`)
   - `CLAUSE-[ID]`: Matched from `CLAUSE [0-9]+(\.[0-9]+)*`
   - `SCHED-[ID]`, `EXHIBIT-[ID]`, `RECITALS`: Detected from contract appendix and preliminary divisions.
3. **Cross-Reference Extraction**:
   - Scans text using legal regex patterns for references like `Schedule [A-Z0-9]+`, `Exhibit [A-Z0-9]+`, `Section \d+(\.\d+)*`, `Clause \d+(\.\d+)*`, `Article [IVXLCDM\d]+`.
   - Normalizes whitespace and deduplicates while maintaining order of appearance.
4. **Non-Blocking Processing**: Heavy PDF block extraction is offloaded via `asyncio.get_event_loop().run_in_executor()` so the FastAPI event loop stays responsive under high concurrent load.
