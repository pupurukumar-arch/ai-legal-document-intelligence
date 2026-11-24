# AI Legal Document Intelligence Platform

## Current demonstration scope

This prototype answers questions only from retrieved contract evidence, follows clause-to-clause and schedule references, and abstains when a required attachment is missing. It also includes a small, versioned Legal Policy Graph for four fictional demo document types: NDA, residential rent, employment and software service agreements. The policy graph powers review prompts and controlled redline templates; it does **not** determine whether a contract is legally valid or enforceable.

### Active prototype storage

ChromaDB is the persistent local document store for this prototype. Each indexed clause stores the original clause text, document ID, filename, document type, page number, section heading and cross-references alongside its semantic embedding. On a query, the Node API reads the clauses from ChromaDB and rebuilds the Contract Graph from stored cross-reference metadata. This keeps the demo self-contained without requiring PostgreSQL.

Generate the four upload-ready fictional PDFs with:

```bash
cd backend-parser
python generate_demo_documents.py
```

For optional Groq or OpenRouter answer generation, copy `backend-api/.env.example` to `.env` and set one provider key. Without a key, the backend uses an evidence-only fallback.

## Optional production database

The active demo persists documents in ChromaDB. PostgreSQL + pgvector remains an optional production architecture for relational data, multi-user ownership, transactions and audit history:

```bash
docker compose up -d postgres
cp backend-api/.env.postgres.example backend-api/.env
```

If your Docker installation does not include the Compose plugin, start the same service with:

```bash
bash scripts/start_postgres.sh
```

Add your existing Groq key to `backend-api/.env`, then restart the Node API. The mounted schema creates `contracts`, `clauses`, dependency edges and pgvector support.
### Structure-aware contract parsing, dependency retrieval and evidence-grounded answers

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyMuPDF](https://img.shields.io/badge/PyMuPDF-1.24+-red.svg)](https://pymupdf.readthedocs.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B%20%2B%20pgvector-blue.svg?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🏛️ Executive Overview

Most traditional Retrieval-Augmented Generation (RAG) pipelines fail when analyzing legal contracts because they chunk text using naive token lengths (e.g. 512 tokens). This slices clauses in half, strips cross-references, and loses essential contractual hierarchy.

The **AI Legal Document Intelligence Platform** explores this problem using a three-tier prototype:
1. **Python Parser Microservice (`backend-parser`)**: Structural layout parsing powered by PyMuPDF (`fitz`), preserving clause boundaries (Articles, Sections, Clauses, Recitals, Schedules) and extracting cross-references (`Section 1.1`, `Schedule A`, `Exhibit B`).
2. **Node.js API Bridge & Graph Retrieval Engine (`backend-api`)**: Express orchestration, PostgreSQL or development in-memory storage, lexical seed retrieval, dependency traversal (`Hop 0 → Hop 1 → Hop 2`), missing-reference verification and optional Gemini generation.
3. **Contract Review Workspace (`frontend`)**: A focused React interface for PDF upload, clause navigation, questions, evidence review and safe refusal when a required schedule or exhibit is absent.

---

## 📐 System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Frontend (React + Vite)                            │
│  - Contract viewer, cross-reference navigation and evidence list             │
│  - Explicit sample-data and live-backend modes                               │
│  - Missing-evidence warning for unattached schedules or exhibits             │
└───────────────────────┬─────────────────────────────────────────────────────┘
                        │
                        │ HTTP REST (JSON / Multipart)
                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Backend API Bridge (Node.js)                          │
│  - Express REST Gateway (POST /api/contracts/upload, POST /api/query)       │
│  - PostgreSQL schema with development in-memory fallback                    │
│  - Directed Dependency Graph Traversal (multiHopQuery)                      │
│  - Evidence verification, Gemini integration and safe fallback              │
└───────────────────────┬─────────────────────────────────────────────────────┘
                        │
                        │ Multipart PDF Stream
                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Backend Parser Microservice (Python)                    │
│  - FastAPI server (POST /parse-pdf, /health)                                │
│  - PyMuPDF (fitz) structural layout hierarchy chunker                       │
│  - Legal cross-reference extraction regex engine                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Repository Structure

```text
legal-document-ai/
├── backend-parser/               # Python FastAPI Microservice
│   ├── main.py                   # FastAPI app with POST /parse-pdf & health
│   ├── parser.py                 # PyMuPDF legal hierarchy layout & ref extractor
│   ├── models.py                 # Pydantic v2 schemas for legal clauses
│   ├── test_service.py           # Unit tests & synthetic legal PDF generator
│   └── requirements.txt          # Python dependencies
│
├── backend-api/                  # Node.js API Bridge & Graph Engine
│   ├── server.js                 # Express application & route handlers
│   ├── db.js                     # PostgreSQL / pgvector connection pool & mock
│   ├── schema.sql                # Relational schema (contracts, clauses, dependencies)
│   ├── services/
│   │   ├── parserService.js      # Streaming proxy to Python microservice
│   │   ├── graphService.js       # Multi-hop graph resolution & traversal
│   │   ├── geminiService.js      # Evidence-only generation and citation checks
│   │   └── queueService.js       # BullMQ Redis task queue
│   ├── test_api.js               # API unit & integration test suite
│   ├── test_e2e_integration.js   # Cross-service end-to-end integration test
│   └── package.json              # Node.js dependencies
│
├── frontend/                     # React + Vite + Tailwind CSS workspace
    ├── src/
    │   ├── components/           # Split-screen viewer, chain-of-evidence, metrics
    │   ├── data/                 # Sample verified contract data & offline mocks
    │   ├── types/                # TypeScript interfaces for legal models
    │   ├── App.tsx               # Main presentation dashboard
    │   └── main.tsx              # Application mount point
    ├── vite.config.ts            # Vite configuration
│   └── package.json              # Frontend dependencies
│
├── report-latex/                 # Mid-term report and viva study source
├── RUN_DEMO.md                   # Local demonstration instructions
└── VIVA_GUIDE.md                 # Concise project viva reference
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**
- *(Optional)* **PostgreSQL 15+** with `pgvector` or **Docker**

---

### Step 1: Start the Python Parser Microservice

```bash
cd backend-parser
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
*Health check available at: `http://localhost:8000/health`*

---

### Step 2: Start the Backend API Bridge

```bash
cd backend-api
npm install
cp .env.example .env

# Optional: Run in mock database mode (no live Postgres required):
# Set USE_MOCK_DB=true in .env
npm start
```
*API running on `http://localhost:3050` or `http://localhost:3000`*

---

### Step 3: Launch the Frontend

```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🧪 Testing & Verification

### 1. Test Python Parser Microservice
```bash
cd backend-parser
.venv/bin/python test_service.py
```

### 2. Test Node.js API Bridge & Graph Traversal
```bash
cd backend-api
npm test
```

### 3. Run End-to-End Cross-Service Test
```bash
cd backend-api
PYTHON_BIN=../backend-parser/.venv/bin/python npm run test:e2e
```

---

## 🛡️ Key Forensic Features

- **Missing-evidence abstention**: When queried about an unattached exhibit (for example, *Schedule B*), the system recognizes the unresolved reference and refuses to invent its contents.
- **Bi-Directional Cross-Reference Jumping**: Instantly navigate from modifying clauses to base definitions with a single click.
- **Full Traceability**: Every answer cites exact clause IDs, page numbers, and multi-hop graph paths (`Hop 0 → Hop 1`).

---

## Project status

This is a mid-term academic prototype. OCR, large-dataset evaluation, dense or hybrid retrieval, authentication and multi-document amendment reasoning remain future work.
