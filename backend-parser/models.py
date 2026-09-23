from typing import List
from pydantic import BaseModel, Field


class ClauseItem(BaseModel):
    """Represents a structurally chunked legal clause or section."""
    clause_id: str = Field(..., description="Normalized hierarchy identifier (e.g., 'SEC-1.1', 'ART-1', 'CLAUSE-2.3')")
    section_title: str = Field(..., description="Extracted title/heading of the section or clause")
    page_number: int = Field(..., description="1-based page number where the clause begins in the PDF")
    content: str = Field(..., description="Extracted text content of the clause bounded by hierarchy")
    cross_references: List[str] = Field(
        default_factory=list,
        description="Detected legal cross-references (e.g. ['Schedule A', 'Exhibit B', 'Section 2.1'])"
    )


class DocumentMetadata(BaseModel):
    """Document-level metadata and processing telemetry."""
    filename: str = Field(..., description="Original filename of the parsed contract")
    total_pages: int = Field(..., description="Total number of pages in the PDF")
    total_clauses: int = Field(..., description="Total number of structural clauses extracted")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")


class ParseResponse(BaseModel):
    """API response model for POST /parse-pdf."""
    success: bool = Field(True, description="Indicates if parsing succeeded")
    metadata: DocumentMetadata
    clauses: List[ClauseItem]
