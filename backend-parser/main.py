"""
FastAPI Microservice for Legal Document Parsing & Structural Layout Chunking.
Part of the AI Legal Document Intelligence Platform.
"""

import time
import asyncio
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import pymupdf as fitz

try:
    from .models import ParseResponse, DocumentMetadata, ClauseItem
    from .parser import LegalHierarchyParser
except ImportError:
    from models import ParseResponse, DocumentMetadata, ClauseItem
    from parser import LegalHierarchyParser
try:
    from .vector_store import index_clauses, search_clauses, get_contract_clauses, list_contracts, delete_contract, index_policy_sources, search_policy_sources
except ImportError:
    from vector_store import index_clauses, search_clauses, get_contract_clauses, list_contracts, delete_contract, index_policy_sources, search_policy_sources

app = FastAPI(
    title="AI Legal Document Intelligence Platform - Backend Parser",
    description=(
        "Microservice executing structural layout chunking by extracting contract "
        "text bounded by legal hierarchy (Article, Section, Clause) rather than raw tokens."
    ),
    version="1.0.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

parser = LegalHierarchyParser()

class VectorIndexRequest(BaseModel):
    contract_id: str
    document_type: str = "unknown"
    clauses: List[dict]
    filename: str = "contract.pdf"

class VectorSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    contract_id: Optional[str] = None
    top_k: int = Field(default=3, ge=1, le=10)

class PolicyIndexRequest(BaseModel):
    sources: List[dict]

class PolicySearchRequest(BaseModel):
    query: str = Field(min_length=1)
    document_type: Optional[str] = None
    top_k: int = Field(default=3, ge=1, le=10)


@app.get("/", tags=["Health"])
async def root():
    """Service status and meta information."""
    return {
        "service": "AI Legal Document Intelligence Platform - Backend Parser",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "parse_pdf": "POST /parse-pdf",
            "health": "GET /health",
            "docs": "GET /docs"
        }
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check probe endpoint."""
    return {"status": "healthy", "service": "backend-parser", "vector_store": "chromadb-local"}

@app.post("/vector/index-clauses", tags=["Vector Retrieval"])
async def vector_index(request: VectorIndexRequest):
    try:
        indexed = index_clauses(request.contract_id, request.document_type, request.clauses, request.filename)
        return {"success": True, "indexed_clauses": indexed, "collection": "contract_clauses"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Vector indexing failed: {exc}")

@app.post("/vector/search", tags=["Vector Retrieval"])
async def vector_search(request: VectorSearchRequest):
    try:
        matches = search_clauses(request.query, request.contract_id, request.top_k)
        return {"success": True, "matches": matches, "retrieval": "chromadb-semantic"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Vector search failed: {exc}")

@app.get("/vector/contracts", tags=["Vector Retrieval"])
async def vector_contracts():
    return {"success": True, "contracts": list_contracts()}

@app.get("/vector/contracts/{contract_id}", tags=["Vector Retrieval"])
async def vector_contract(contract_id: str):
    found = get_contract_clauses(contract_id)
    if not found:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {"success": True, "contract": {"id": contract_id, "filename": found[0]["filename"], "document_type": found[0]["document_type"], "total_clauses": len(found)}, "clauses": found}

@app.delete("/vector/contracts/{contract_id}", tags=["Vector Retrieval"])
async def delete_vector_contract(contract_id: str):
    removed = delete_contract(contract_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {"success": True, "removed_clauses": removed}

@app.post("/vector/index-policy-sources", tags=["Vector Retrieval"])
async def policy_index(request: PolicyIndexRequest):
    try:
        return {"success": True, "indexed_sources": index_policy_sources(request.sources), "collection": "legal_policy_sources"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Policy indexing failed: {exc}")

@app.post("/vector/search-policy-sources", tags=["Vector Retrieval"])
async def policy_search(request: PolicySearchRequest):
    try:
        return {"success": True, "matches": search_policy_sources(request.query, request.document_type, request.top_k), "retrieval": "chromadb-policy-semantic"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Policy search failed: {exc}")


@app.post(
    "/parse-pdf",
    response_model=ParseResponse,
    status_code=status.HTTP_200_OK,
    summary="Parse uploaded PDF contract into legal hierarchy chunks",
    tags=["Parser"]
)
async def parse_pdf(file: UploadFile = File(..., description="PDF contract to parse")):
    """
    Receives an uploaded PDF contract, extracts visual layout and bounding legal hierarchy
    (Article, Section, Clause), and returns structured JSON with:
    - `clause_id` (e.g., 'SEC-1.1')
    - `section_title`
    - `page_number`
    - `content`
    - `cross_references` (e.g. ['Schedule A', 'Exhibit B', 'Section 2.1'])
    """
    # 1. Validation: check file extension and content type
    filename = file.filename or "contract.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format for '{filename}'. Only PDF documents are supported."
        )

    # 2. Read PDF bytes
    try:
        content_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    if not content_bytes or len(content_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded PDF file is empty (0 bytes)."
        )

    # 3. Process PDF layout & structural hierarchy
    start_time = time.perf_counter()

    try:
        # Run parsing in default threadpool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        clauses: List[ClauseItem] = await loop.run_in_executor(
            None,
            parser.parse_pdf_bytes,
            content_bytes,
            filename
        )

        # Inspect total page count via fitz
        with fitz.open(stream=content_bytes, filetype="pdf") as doc:
            total_pages = len(doc)

    except fitz.FileDataError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Corrupted or invalid PDF file: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing the PDF: {str(e)}"
        )

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return ParseResponse(
        success=True,
        metadata=DocumentMetadata(
            filename=filename,
            total_pages=total_pages,
            total_clauses=len(clauses),
            processing_time_ms=elapsed_ms
        ),
        clauses=clauses
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
