# Frontend - AI Legal Document Intelligence Platform
### Mid-Viva Presentation Dashboard (React + Vite + TypeScript + Tailwind CSS)

Executive, presentation-grade legal intelligence dashboard designed for the **B.Tech Major Project Mid-Viva Evaluation**.

---

## 🏛️ Key Features

### 1. Split-Screen Legal Analysis Workspace
- **Left Panel (Interactive Document Viewer)**:
  - Displays contract clauses chunked by **legal hierarchy** (Articles, Sections, Clauses, Schedules) rather than arbitrary tokens.
  - **Canonical Badges**: Color-coded identifiers (`SEC-1.1`, `SEC-1.2`, `SCHED-A`, `CLAUSE-3.1`).
  - **Clickable Cross-References**: Clicking any cross-reference tag (e.g. `[Schedule A]`, `[Section 1.1]`) automatically scrolls to and illuminates the cited clause with a cyan glowing pulse animation.
  - In-document keyword and clause ID filter bar.
- **Right Panel (Forensic Chain-of-Evidence UI)**:
  - Visualizes the 4-step forensic reasoning process behind every legal conclusion:
    `[Retrieved Clause] → [Dependency Traversal] → [Verification] → [Verdict]`
  - Step 1: Candidate seed clause from vector/lexical retrieval (`Hop 0`).
  - Step 2: Multi-hop graph expansion traversing `clause_dependencies` (`Hop 1` & `Hop 2`).
  - Step 3: Forensic verification checking physical presence of cited schedules and terms.
  - Step 4: Synthesized verdict with provenance citations.

### 2. Hallucination Prevention & "ABSTAIN: Missing Evidence" Badge
- A core architectural innovation of this project is **forensic non-hallucination**.
- If a legal query asks about an unattached schedule (e.g. *"Is Schedule B attached?"* or toggling **Simulate Missing Evidence**):
  - The system traverses the graph, detects that `Schedule B` is cited in Section 2.1 but omitted from the document body.
  - Triggers a prominent glowing red **`ABSTAIN: Missing Evidence`** badge.
  - Explains the omission rather than inventing speculative terms, protecting clients from contractual hallucination.

### 3. Dual-Mode: Live Services & Offline Presentation Safe Mode
- Connects live to:
  - Node.js API Bridge: `http://localhost:3050/api/contracts/upload` & `/api/query`
  - Python Parser: `http://localhost:8000/parse-pdf`
- **Offline Presentation Mode**: An instant toggle switch on the top navigation bar. If presenting in an auditorium or before evaluators where local servers or networks fail, the UI seamlessly runs using verified offline legal contract data with zero presentation downtime!

---

## 🚀 Quickstart & Setup Instructions

### 1. Installation
```bash
cd frontend
npm install
```

### 2. Launch Development Server
```bash
npm run dev
```
The application will start at `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
```

---

## 🎯 Mid-Viva Demonstration Flow (For Evaluators)

1. **Demonstrate Structural Layout Chunking (Left Panel)**:
   - Point out that clauses are bounded by canonical IDs (`SEC-1.1`, `SEC-1.2`, `SCHED-A`) rather than generic 512-token chunks.
   - Click the `Schedule A` cross-reference tag inside Section 1.2: notice how the viewer smoothly scrolls and pulses `SCHEDULE A` on Page 2.
2. **Demonstrate Multi-Hop Chain-of-Evidence (Right Panel)**:
   - Click the preset: *"Exclusions (Multi-Hop)"*.
   - Walk the evaluators through the 4 steps:
     - Step 1: Seed clause matched (`SEC-1.2`).
     - Step 2: Traversed graph to pull definitions (`SEC-1.1`) and assets (`SCHED-A`).
     - Step 3: Verified Schedule A exists on Page 2.
     - Step 4: Synthesized complete legal verdict.
3. **Demonstrate Hallucination Prevention & Abstention**:
   - Click the red preset: *"Is Schedule B Attached? (ABSTAIN Demo)"*.
   - Show the prominent glowing red **`ABSTAIN: Missing Evidence`** badge.
   - Highlight that the system deliberately abstains because Schedule B was cited in Section 2.1 but omitted from the contract.
4. **Demonstrate Full-Stack PDF Upload**:
   - Click **Upload Contract** in the top navigation bar.
   - Select or drag & drop any PDF agreement (or `backend-api/sample_contract.pdf`).
   - Watch the real-time telemetry: PyMuPDF parsing in `< 25ms`, clauses stored, and dependency graph linked in PostgreSQL.
