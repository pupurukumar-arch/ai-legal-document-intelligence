"""
Test Suite for Backend Parser Microservice.
Validates structural layout chunking, legal hierarchy boundaries,
and cross-reference extraction using synthetic PDF contracts.
"""

import io
import sys
import os
import pymupdf as fitz
from fastapi.testclient import TestClient

# Ensure backend-parser folder is in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from main import app
from parser import LegalHierarchyParser, extract_cross_references


def generate_synthetic_legal_pdf() -> bytes:
    """
    Programmatically creates a realistic multi-page legal contract PDF using PyMuPDF.
    Includes Articles, Sections, Clauses, Recitals, and Cross-References.
    """
    doc = fitz.open()

    # Page 1: Title, Recitals, and Article 1
    page1 = doc.new_page()
    p1_text = """MASTER SERVICES AND CONFIDENTIALITY AGREEMENT

PREAMBLE
This Master Agreement is entered into on October 1, 2025, between Alpha Corp ("Discloser") and Beta LLC ("Recipient").

RECITALS
WHEREAS, Discloser possesses proprietary intellectual property;
WHEREAS, the parties desire to explore commercial collaboration.

ARTICLE 1 - DEFINITIONS
Section 1.1 Confidential Information.
"Confidential Information" refers to all proprietary data disclosed under this Agreement, whether oral or written, including technical diagrams, source code, and business plans.

Section 1.2 Exclusions from Protection.
The confidentiality obligations under Section 1.1 shall not apply to public information or materials explicitly cataloged in Schedule A attached hereto.
"""
    rect = fitz.Rect(50, 50, 550, 800)
    page1.insert_textbox(rect, p1_text, fontsize=10, fontname="helv")

    # Page 2: Article 2, Article 3, Clause, and Schedule
    page2 = doc.new_page()
    p2_text = """ARTICLE 2 - OBLIGATIONS AND COVENANTS
Section 2.1 Non-Disclosure Duty.
The Recipient agrees to hold all Confidential Information in strict confidence and shall not disclose it to third parties without prior written consent, subject to Schedule B and Section 1.1.

Section 2.2 Standard of Care.
Recipient shall use the same degree of care it employs to protect its own sensitive data, as further outlined in Clause 3.1.

ARTICLE 3 - TERM AND TERMINATION
Clause 3.1 Duration.
This Agreement continues in full force for a period of two (2) years, unless terminated earlier pursuant to Section 2.1 or Article 2.

SCHEDULE A - EXCLUDED ASSETS
1. Public domain specifications and open-source documentation.
2. Independent third-party reports.
"""
    page2.insert_textbox(rect, p2_text, fontsize=10, fontname="helv")

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_cross_reference_extraction():
    """Verify regex accuracy for detecting legal cross references."""
    sample_text = (
        "Subject to Schedule A and Exhibit B-1, the terms of Section 1.1 and "
        "Clause 3.2 shall govern in accordance with Article IV."
    )
    refs = extract_cross_references(sample_text)
    print(f"[TEST] Extracted Cross-References: {refs}")
    assert "Schedule A" in refs
    assert "Exhibit B-1" in refs
    assert "Section 1.1" in refs
    assert "Clause 3.2" in refs
    assert "Article IV" in refs


def test_parser_structural_chunking():
    """Verify that PyMuPDF parses legal hierarchy rather than token counts."""
    pdf_bytes = generate_synthetic_legal_pdf()
    parser = LegalHierarchyParser()
    clauses = parser.parse_pdf_bytes(pdf_bytes, filename="test_contract.pdf")

    print(f"[TEST] Extracted {len(clauses)} clauses:")
    for c in clauses:
        print(f"  - [{c.clause_id}] (Page {c.page_number}) '{c.section_title}': {len(c.content)} chars, Refs: {c.cross_references}")

    clause_ids = [c.clause_id for c in clauses]

    # Verify structural hierarchy IDs
    assert any("SEC-1.1" in cid for cid in clause_ids), f"Missing SEC-1.1 in {clause_ids}"
    assert any("SEC-1.2" in cid for cid in clause_ids), f"Missing SEC-1.2 in {clause_ids}"
    assert any("SEC-2.1" in cid for cid in clause_ids), f"Missing SEC-2.1 in {clause_ids}"
    assert any("CLAUSE-3.1" in cid for cid in clause_ids), f"Missing CLAUSE-3.1 in {clause_ids}"
    assert any("SCHED-A" in cid or "SCHEDULE" in cid for cid in clause_ids), f"Missing Schedule A in {clause_ids}"

    # Verify specific cross references extracted in clauses
    sec_1_2 = next(c for c in clauses if "SEC-1.2" in c.clause_id)
    assert any("Schedule A" in r for r in sec_1_2.cross_references)
    assert any("Section 1.1" in r for r in sec_1_2.cross_references)

    sec_2_1 = next(c for c in clauses if "SEC-2.1" in c.clause_id)
    assert any("Schedule B" in r for r in sec_2_1.cross_references)
    assert any("Section 1.1" in r for r in sec_2_1.cross_references)

    clause_3_1 = next(c for c in clauses if "CLAUSE-3.1" in c.clause_id)
    assert any("Article 2" in r for r in clause_3_1.cross_references)
    assert any("Section 2.1" in r for r in clause_3_1.cross_references)


def test_api_endpoint():
    """Verify FastAPI POST /parse-pdf with TestClient."""
    client = TestClient(app)

    # 1. Health check
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    # 2. Upload valid PDF
    pdf_bytes = generate_synthetic_legal_pdf()
    files = {"file": ("contract.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    res_parse = client.post("/parse-pdf", files=files)

    assert res_parse.status_code == 200, res_parse.text
    data = res_parse.json()

    assert data["success"] is True
    assert data["metadata"]["filename"] == "contract.pdf"
    assert data["metadata"]["total_pages"] == 2
    assert data["metadata"]["total_clauses"] > 0
    assert data["metadata"]["processing_time_ms"] > 0

    clauses = data["clauses"]
    first = clauses[0]
    assert "clause_id" in first
    assert "section_title" in first
    assert "page_number" in first
    assert "content" in first
    assert "cross_references" in first

    # 3. Validation: Reject non-PDF
    invalid_file = {"file": ("notes.txt", io.BytesIO(b"hello world"), "text/plain")}
    res_bad = client.post("/parse-pdf", files=invalid_file)
    assert res_bad.status_code == 400

    # 4. Validation: Reject empty PDF
    empty_file = {"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")}
    res_empty = client.post("/parse-pdf", files=empty_file)
    assert res_empty.status_code == 400

    print("[SUCCESS] All unit, parser, and API integration tests passed cleanly!")


if __name__ == "__main__":
    print("Running test suite...")
    test_cross_reference_extraction()
    test_parser_structural_chunking()
    test_api_endpoint()
