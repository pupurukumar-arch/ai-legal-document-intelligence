# AI Legal Document Intelligence Platform
### Enterprise-Grade Structural Hierarchy Chunking, Directed Graph Retrieval & Forensic Multi-Hop Legal Analysis

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

The **AI Legal Document Intelligence Platform** solves this using a 3-tier specialized architecture:
1. **Python Parser Microservice (`backend-parser`)**: Structural layout parsing powered by PyMuPDF (`fitz`), preserving clause boundaries (Articles, Sections, Clauses, Recitals, Schedules) and extracting cross-references (`Section 1.1`, `Schedule A`, `Exhibit B`).
2. **Node.js API Bridge & Graph Retrieval Engine (`backend-api`)**: Express orchestration bridge backed by PostgreSQL + `pgvector` with a multi-hop dependency traversal engine (`Hop 0 → Hop 1 → Hop 2`) and BullMQ job queue.
3. **Forensic Analysis Dashboard (`frontend`)**: Executive split-screen legal intelligence interface featuring interactive clause navigation, glowing cross-reference jumping, 4-step forensic chain-of-evidence visualization, and an **`ABSTAIN: Missing Evidence`** hallucination safeguard.

---

## 📐 System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Frontend (React + Vite)                            │
│  - Split-screen legal document viewer & cross-reference highlight jump       │
│  - 4-step forensic chain-of-evidence (Retrieved -> Graph -> Verify -> Verdict)│
│  - ABSTAIN: Missing Evidence badge for unattached schedules & hallucination │
└───────────────────────┬─────────────────────────────────────────────────────┘
                        │
                        │ HTTP REST (JSON / Multipart)
                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Backend API Bridge (Node.js)                          │
│  - Express REST Gateway (POST /api/contracts/upload, POST /api/query)       │
│  - PostgreSQL + pgvector schema & mock fallback                             │
│  - Directed Dependency Graph Traversal (multiHopQuery)                      │
│  - Redis + BullMQ asynchronous job queue                                    │
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
│   │   └── queueService.js       # BullMQ Redis task queue
│   ├── test_api.js               # API unit & integration test suite
│   ├── test_e2e_integration.js   # Cross-service end-to-end integration test
│   └── package.json              # Node.js dependencies
│
└── frontend/                     # React + Vite + Tailwind CSS Dashboard
    ├── src/
    │   ├── components/           # Split-screen viewer, chain-of-evidence, metrics
    │   ├── data/                 # Sample verified contract data & offline mocks
    │   ├── types/                # TypeScript interfaces for legal models
    │   ├── App.tsx               # Main presentation dashboard
    │   └── main.tsx              # Application mount point
    ├── vite.config.ts            # Vite configuration
    └── package.json              # Frontend dependencies
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

### Step 3: Launch the Frontend Presentation Dashboard

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
python test_service.py
```

### 2. Test Node.js API Bridge & Graph Traversal
```bash
cd backend-api
npm test
```

### 3. Run End-to-End Cross-Service Test
```bash
cd backend-api
npm run test:e2e
```

---

## 🛡️ Key Forensic Features

- **Non-Hallucinatory Abstention**: When queried about unattached exhibits (e.g. *Schedule B*), the system recognizes the reference without guessing its contents, displaying a verified `ABSTAIN: Missing Evidence` notice.
- **Bi-Directional Cross-Reference Jumping**: Instantly navigate from modifying clauses to base definitions with a single click.
- **Full Traceability**: Every answer cites exact clause IDs, page numbers, and multi-hop graph paths (`Hop 0 → Hop 1`).

---

## 📄 License

MIT License. Designed and developed for the AI Legal Document Intelligence Platform.
