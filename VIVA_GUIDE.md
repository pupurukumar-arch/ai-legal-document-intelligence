# Mid-Semester Viva Guide (18 Minutes, 3 Members)

## What is genuinely implemented

- PDF upload through the Node API to the Python parser
- PyMuPDF text extraction with rule-based structural clause boundaries
- Explicit cross-reference extraction for sections, clauses, articles, schedules, and exhibits
- Clause dependency persistence and multi-hop traversal
- Lexical clause retrieval
- Deterministic missing-reference detection and safe abstention
- Optional evidence-constrained Gemini answer generation with citation validation
- Evidence-only fallback when no Gemini key is configured
- A React evidence viewer with an explicitly labelled offline demo mode

## What is planned, not yet implemented

- Dense embeddings and BM25 hybrid retrieval
- Quantitative evaluation on a contract benchmark
- Multi-document amendment and supersession resolution
- Authentication, privacy controls, and production deployment

## Member 1 - Problem and research gaps (6 minutes)

### Opening

Our project is an AI Legal Document Intelligence Platform for contract analysis. It is not intended to provide legal advice or replace lawyers. Its purpose is to help a human reviewer find, connect, and verify contractual evidence.

### Research gaps

1. **Semantic fragmentation:** Fixed-size token chunking can split a clause, separating its heading, conditions, and exceptions.
2. **Cross-clause dependencies:** An obligation may be altered by a definition, exception, survival clause, or termination clause elsewhere in the contract.
3. **Multi-document conflicts:** An addendum may override an earlier agreement, while ordinary similarity search can retrieve both without resolving precedence.
4. **Missing-evidence hallucination:** A contract may refer to an absent schedule or exhibit. A language model may still produce a plausible but unsupported answer.
5. **Opaque reasoning:** Many systems return an answer without showing the exact clauses and dependency path used to support it.

### Research question

Can structure-aware clause retrieval with dependency verification improve citation correctness and refusal accuracy compared with fixed-size RAG?

## Member 2 - Architecture and implementation (6 minutes)

1. The user uploads a PDF contract.
2. PyMuPDF extracts text blocks with page information.
3. Structural rules identify articles, sections, clauses, schedules, and exhibits.
4. Every extracted clause is stored as a node.
5. Explicit references such as `Section 1.1` and `Schedule B` become directed dependency edges.
6. Lexical retrieval selects initial evidence nodes.
7. Multi-hop traversal follows resolved references.
8. The verifier identifies references that do not resolve to an extracted clause.
9. If evidence is missing, the backend returns an abstention before any LLM is called.

The current retrieval baseline is lexical. Dense vectors, BM25 fusion, and Gemini are later milestones and must not be described as complete.

## Member 3 - Demo, evaluation, and roadmap (5 minutes)

### Demo sequence

1. Start in **Live Services Mode**.
2. Upload `backend-api/sample_contract.pdf`.
3. Show the extracted hierarchy and cross-references.
4. Ask: `What are the exclusions from protection?`
5. Show the seed clause and the resolved `Section 1.1` and `Schedule A` dependencies.
6. Ask: `Is Schedule B attached and what does it require?`
7. Show the genuine backend response: `ABSTAIN: Missing Evidence`.

### Planned evaluation

- Clause boundary precision, recall, and F1
- Retrieval recall at k
- Citation validity
- Answer correctness
- Missing-evidence/refusal accuracy
- False-refusal rate
- Latency

Compare structural chunking against a fixed 500-token baseline on the same contracts and questions.

## Shared conclusion (1 minute)

The project contribution is not merely connecting a chatbot to PDFs. It combines clause-preserving extraction, dependency-aware retrieval, deterministic missing-evidence verification, and an auditable evidence interface. The current prototype proves the end-to-end foundation; the remaining project will add hybrid retrieval, controlled generation, multi-document precedence, and formal evaluation.

## Prepared panel questions

### How is this different from ordinary RAG?

Ordinary RAG often chunks by token count and retrieves independent passages. Our approach preserves legal clause boundaries and traverses explicit contractual references before producing an answer.

### Does the system eliminate hallucinations?

No system can guarantee that. Our design reduces unsupported answers through deterministic missing-reference checks, constrained evidence, citation validation, and abstention tests.

### Why use a graph?

Contracts are not purely sequential text. Clauses explicitly depend on definitions, exceptions, schedules, and other clauses. Directed edges preserve those relationships for retrieval and auditability.

### Why use Gemini later?

Gemini will only convert verified retrieved evidence into a readable answer. Retrieval, dependency checking, and citation validation remain controlled by our backend.

### What is the research contribution?

The research contribution is the comparison of structure-aware, dependency-verified retrieval against fixed-size RAG using measurable citation and refusal outcomes.
