# Backend API Bridge Microservice
### AI Legal Document Intelligence Platform (Node.js + Express + PostgreSQL/pgvector)

Orchestration and API bridge layer connecting the user-facing application, the Python layout parser (`/backend-parser`), PostgreSQL with `pgvector`, and a multi-hop legal retrieval engine.

---

## 🏗️ Architecture & Features

- **Upload & Parsing Proxy (`POST /api/contracts/upload`)**:
  - Receives multipart PDF contract uploads.
  - Streams the PDF binary to the Python FastAPI parser microservice (`http://localhost:8000/parse-pdf`).
  - Persists parsed legal clauses into PostgreSQL (`clauses` table with `vector(1536)` column).
  - Resolves cross-references (e.g., `"Section 1.1"`, `"Schedule A"`) and models directed contractual relationships in `clause_dependencies`.
- **Multi-Hop Legal Retrieval (`POST /api/query`)**:
  - Contracts are dependency graphs. When an attorney or AI agent searches for *"exclusions to confidentiality"*, direct keyword/vector search lands on the exclusions clause (`Hop 0`).
  - The multi-hop engine traverses `clause_dependencies` (`Hop 1` & `Hop 2`) to automatically retrieve companion schedules (`Schedule A`) and definition clauses (`Section 1.1`), providing a self-contained legal context for downstream LLM reasoning.
- **Background Task Management (`BullMQ`)**:
  - Uses Redis-backed queues for asynchronous embedding generation and heavy document graph enrichment.

---

## 🐘 PostgreSQL + pgvector Setup Instructions

### Option A: Quickstart with Docker (Recommended)

Run a PostgreSQL container with pre-installed `pgvector`:

```bash
docker run -d \
  --name legal-ai-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=legal_ai_db \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

Apply the database schema:
```bash
# Using psql inside container or from host:
docker exec -i legal-ai-postgres psql -U postgres -d legal_ai_db < backend-api/schema.sql
```

---

### Option B: Native Installation (Windows / Linux / macOS)

1. Install **PostgreSQL 15+** from [postgresql.org](https://www.postgresql.org/download/).
2. Install the **pgvector** extension following instructions at [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector#installation).
3. Create the platform database and apply `schema.sql`:
   ```bash
   createdb -U postgres legal_ai_db
   psql -U postgres -d legal_ai_db -f backend-api/schema.sql
   ```

> **Note for Local Testing without Postgres**:  
> The service includes an automatic in-memory mock store fallback. If PostgreSQL is offline during development or automated testing, all routes function seamlessly without crashing.

---

## ⚙️ Environment Variables

Create `.env` inside `backend-api/`:

```env
# Application Port
PORT=3000

# Python Parser Microservice URL
PARSER_SERVICE_URL=http://127.0.0.1:8000/parse-pdf

# PostgreSQL with pgvector
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/legal_ai_db

# Redis for BullMQ (Optional for local dev)
REDIS_HOST=localhost
REDIS_PORT=6379

# Mock Mode (Set to true to force in-memory storage)
USE_MOCK_DB=false
```

---

## 🚀 Running the Microservice

### 1. Install Node.js Dependencies
```bash
cd backend-api
npm install
```

### 2. Start the Services

#### Terminal 1: Start Python Parser Microservice
```bash
python -m uvicorn backend-parser.main:app --reload --port 8000
```

#### Terminal 2: Start Node.js API Bridge
```bash
cd backend-api
npm start
```
The server will start at `http://localhost:3000`.

---

## 📡 API Reference & cURL Examples

### 1. Upload & Ingest Contract
Proxies the PDF to the Python parser, stores clauses, and constructs dependency graph links.

```bash
curl -X POST "http://localhost:3000/api/contracts/upload" \
  -F "file=@sample_agreement.pdf;type=application/pdf"
```

**Response (201 Created)**:
```json
{
  "success": true,
  "contract_id": "8b52fbf3-a178-43d9-a29d-7a6c27632619",
  "filename": "sample_agreement.pdf",
  "total_pages": 2,
  "total_clauses": 9,
  "dependencies_linked": 6,
  "parser_time_ms": 21.4,
  "clauses": [
    {
      "id": "e445da9b-e85d-4f1b-a59a-115f0133c5e8",
      "clause_id": "SEC-1.2",
      "section_title": "Exclusions from Protection",
      "page_number": 1,
      "content": "The obligations of Section 1.1 shall not apply to materials in Schedule A.",
      "cross_references": ["Section 1.1", "Schedule A"]
    }
  ]
}
```

---

### 2. Multi-Hop Legal Retrieval
Performs semantic/keyword seed retrieval (`Hop 0`), traverses `clause_dependencies` (`Hop 1` & `Hop 2`), and synthesizes full legal context.

```bash
curl -X POST "http://localhost:3000/api/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the exclusions to confidential information?",
    "contract_id": "8b52fbf3-a178-43d9-a29d-7a6c27632619",
    "top_k": 2,
    "hops": 2
  }'
```

**Response (200 OK)**:
```json
{
  "success": true,
  "query": "What are the exclusions to confidential information?",
  "contract_id": "8b52fbf3-a178-43d9-a29d-7a6c27632619",
  "direct_matches": [
    {
      "clause_id": "SEC-1.2",
      "section_title": "Exclusions from Protection",
      "page_number": 1,
      "relevance_score": 9,
      "hop_level": 0
    }
  ],
  "multi_hop_references": [
    {
      "clause_id": "SEC-1.1",
      "section_title": "Confidential Information",
      "page_number": 1,
      "hop_level": 1,
      "relation_type": "CROSS_REFERENCE",
      "referenced_by": "SEC-1.2"
    },
    {
      "clause_id": "SCHED-A",
      "section_title": "SCHEDULE A",
      "page_number": 2,
      "hop_level": 1,
      "relation_type": "ATTACHMENT_REFERENCE",
      "referenced_by": "SEC-1.2"
    }
  ],
  "total_context_clauses": 3,
  "full_context": "=== DIRECT RETRIEVAL MATCHES (HOP 0) ===\n[SEC-1.2] Exclusions from Protection...\n\n=== MULTI-HOP DEPENDENCY CONTEXT (HOPS 1-2) ===\n[SEC-1.1] Confidential Information (via SEC-1.2 -> CROSS_REFERENCE)...\n[SCHED-A] SCHEDULE A (via SEC-1.2 -> ATTACHMENT_REFERENCE)..."
}
```

---

### 3. Health & Readiness Probe
```bash
curl http://localhost:3000/health
```
```json
{
  "status": "healthy",
  "service": "backend-api",
  "database": "connected",
  "python_parser": "reachable",
  "redis_queue": "connected"
}
```
