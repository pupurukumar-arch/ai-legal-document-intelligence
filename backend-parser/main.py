"""
FastAPI Microservice for Legal Document Parsing & Structural Layout Chunking.
Part of the AI Legal Document Intelligence Platform.
"""

import time
import asyncio
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import pymupdf as fitz

try:
    from .models import ParseResponse, DocumentMetadata, ClauseItem
    from .parser import LegalHierarchyParser
except ImportError:
    from models import ParseResponse, DocumentMetadata, ClauseItem
    from parser import LegalHierarchyParser

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
    return {"status": "healthy", "service": "backend-parser"}


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
