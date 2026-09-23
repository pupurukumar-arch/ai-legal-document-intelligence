"""
Structural Layout & Legal Hierarchy Chunking Engine.

Uses PyMuPDF (fitz) to extract text bounded by legal hierarchy
(Article, Section, Clause, Recitals, Schedules, Exhibits) rather than raw token counts.
Also extracts legal cross-references (e.g., 'Schedule A', 'Section 2.1', 'Exhibit B').
"""

import re
from typing import List, Dict, Any, Optional, Tuple
import pymupdf as fitz
try:
    from .models import ClauseItem, DocumentMetadata, ParseResponse
except ImportError:
    from models import ClauseItem, DocumentMetadata, ParseResponse


# ============================================================================
# Regular Expressions for Legal Hierarchy & Boundaries
# ============================================================================

# 1. Articles (e.g., "ARTICLE I", "ARTICLE 1 - DEFINITIONS", "Article 2:")
RE_ARTICLE = re.compile(
    r"^(?:ARTICLE|Article)\s+([IVXLCDM\d]+)[\.\:\s\-\—]*(.*)$",
    re.IGNORECASE
)

# 2. Explicit Section Headers (e.g., "SECTION 1.1", "Section 2.3 - Confidentiality", "SECTION 1")
RE_EXPLICIT_SECTION = re.compile(
    r"^(?:SECTION|Section)\s+(\d+(?:\.\d+)*)[\.\:\s\-\—]*(.*)$"
)

# 3. Numeric Section Headers (e.g., "1.1 Confidential Information", "2.3.1 Notice Period.", "1. DEFINITIONS")
RE_NUMERIC_SECTION = re.compile(
    r"^(\d+\.\d+(?:\.\d+)*)[\.\:\s\-\—]+([A-Z\"\'\(\[].*)$"
)
RE_SINGLE_NUM_SECTION = re.compile(
    r"^(\d+)[\.\:\s\-\—]+([A-Z][A-Za-z0-9\s,\-'\"]{2,60})$"
)

# 4. Clauses (e.g., "CLAUSE 3.1", "Clause 4 - Termination")
RE_CLAUSE = re.compile(
    r"^(?:CLAUSE|Clause)\s+(\d+(?:\.\d+)*)[\.\:\s\-\—]*(.*)$"
)

# 5. Special Contract Divisions (Recitals, Preamble, Schedules, Exhibits, Appendices)
RE_SPECIAL_DIVISION = re.compile(
    r"^(RECITALS|PREAMBLE|WITNESSETH|SCHEDULE\s+[A-Z0-9]+|EXHIBIT\s+[A-Z0-9]+|APPENDIX\s+[A-Z0-9]+|ANNEX\s+[A-Z0-9]+)[\.\:\s\-\—]*(.*)$",
    re.IGNORECASE
)

# ============================================================================
# Regular Expressions for Legal Cross-References Detection
# ============================================================================

RE_CROSS_REFERENCES = re.compile(
    r"\b("
    r"(?:Schedule|Exhibit|Appendix|Annex|Attachment)\s+[A-Z0-9]+(?:[\.\-][A-Z0-9]+)*|"
    r"(?:Section|Clause)\s+\d+(?:\.\d+)*|"
    r"(?:Sections|Clauses)\s+\d+(?:\.\d+)*(?:\s*(?:and|or|,)\s*\d+(?:\.\d+)*)+|"
    r"(?:Article)\s+(?:[IVXLCDM]+|\d+(?:\.\d+)*)"
    r")\b",
    re.IGNORECASE
)


def extract_cross_references(text: str) -> List[str]:
    """
    Extracts, normalizes, and deduplicates legal cross-references from text
    while preserving order of appearance.
    """
    if not text:
        return []

    found = RE_CROSS_REFERENCES.findall(text)
    seen = set()
    cleaned_refs: List[str] = []

    for ref in found:
        # Normalize internal whitespace
        normalized = re.sub(r"\s+", " ", ref.strip())
        normalized_lower = normalized.lower()
        if normalized_lower not in seen:
            seen.add(normalized_lower)
            cleaned_refs.append(normalized)

    return cleaned_refs


class LegalHierarchyParser:
    """
    Performs layout-aware structural chunking on legal contract PDFs.
    Traverses PDF pages, reconstructs visual text flow, identifies legal
    hierarchy demarcations, and chunks by legal boundaries rather than tokens.
    """

    def __init__(self):
        pass

    def parse_pdf_bytes(self, pdf_bytes: bytes, filename: str = "document.pdf") -> List[ClauseItem]:
        """
        Parses a PDF from in-memory bytes and returns a list of ClauseItems.
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        return self._parse_document(doc, filename)

    def _parse_document(self, doc: fitz.Document, filename: str) -> List[ClauseItem]:
        """
        Iterates over document pages, detects structural headings, and builds
        coherent legal clause chunks.
        """
        raw_chunks: List[Dict[str, Any]] = []
        current_article: Optional[str] = None
        current_chunk: Optional[Dict[str, Any]] = None

        def finalize_current_chunk():
            nonlocal current_chunk
            if current_chunk and current_chunk["lines"]:
                full_content = "\n".join(current_chunk["lines"]).strip()
                if full_content:
                    current_chunk["content"] = full_content
                    current_chunk["cross_references"] = extract_cross_references(full_content)
                    raw_chunks.append(current_chunk)
            current_chunk = None

        total_pages = len(doc)

        for page_idx in range(total_pages):
            page_num = page_idx + 1
            page = doc[page_idx]

            # Extract structured text blocks (type 0 = text, 1 = image)
            # PyMuPDF naturally orders blocks top-to-bottom, left-to-right
            blocks = page.get_text("blocks")

            for block in blocks:
                if len(block) < 5 or block[4] is None:
                    continue

                block_text = block[4].strip()
                if not block_text:
                    continue

                # Process block line by line to detect boundary headings
                lines = [line.strip() for line in block_text.split("\n") if line.strip()]
                if not lines:
                    continue

                line_idx = 0
                while line_idx < len(lines):
                    line = lines[line_idx]

                    # Check if line matches an Article, Section, Clause, or Special Division
                    heading_match = self._match_heading(line, lines, line_idx)

                    if heading_match:
                        # Finalize previous active chunk
                        finalize_current_chunk()

                        clause_id, section_title, remainder_text, consumed_lines = heading_match

                        # Update Article tracking if applicable
                        if clause_id.startswith("ART-"):
                            current_article = section_title or clause_id

                        # Start new chunk
                        current_chunk = {
                            "clause_id": clause_id,
                            "section_title": section_title,
                            "page_number": page_num,
                            "lines": [remainder_text] if remainder_text else [],
                        }

                        line_idx += consumed_lines
                    else:
                        # Ordinary content line
                        if current_chunk is None:
                            # Pre-section content (e.g. Agreement title, parties, preamble)
                            current_chunk = {
                                "clause_id": "PREAMBLE",
                                "section_title": "Preamble & Recitals",
                                "page_number": page_num,
                                "lines": [line],
                            }
                        else:
                            current_chunk["lines"].append(line)
                        line_idx += 1

        # Finalize the last chunk
        finalize_current_chunk()

        # Convert raw chunk dictionaries to ClauseItem objects
        clauses: List[ClauseItem] = []
        for idx, chunk in enumerate(raw_chunks):
            # Clean section title if empty
            title = chunk["section_title"].strip() if chunk["section_title"] else "Untitled Section"
            clause_id = chunk["clause_id"] or f"SEC-{idx+1}"

            clauses.append(
                ClauseItem(
                    clause_id=clause_id,
                    section_title=title,
                    page_number=chunk["page_number"],
                    content=chunk["content"],
                    cross_references=chunk.get("cross_references", [])
                )
            )

        return clauses

    def _match_heading(
        self,
        line: str,
        lines: List[str],
        line_idx: int
    ) -> Optional[Tuple[str, str, str, int]]:
        """
        Attempts to match a line against legal hierarchy patterns.
        Returns: (clause_id, section_title, remainder_text, consumed_lines)
        or None if not a structural heading.
        """
        clean_line = line.strip()

        # Check if previous line ended with an unfinished phrase or reference keyword
        if line_idx > 0:
            prev_line = lines[line_idx - 1].strip()
            if re.search(r"\b(?:Section|Clause|Article|Schedule|Exhibit|to|and|or|in|of|under|with|pursuant)\s*$", prev_line, re.IGNORECASE):
                return None

        # Check 1: Article (e.g. "ARTICLE 1", "ARTICLE I: DEFINITIONS", "Article 2")
        m_art = RE_ARTICLE.match(clean_line)
        if m_art:
            art_num = m_art.group(1).strip()
            rest = m_art.group(2).strip()
            consumed = 1
            # If rest is empty and next line exists and looks like a title
            title = rest
            remainder = ""
            if not title and line_idx + 1 < len(lines):
                next_line = lines[line_idx + 1].strip()
                # Check if next line is a short title (under 80 chars, not starting with number)
                if len(next_line) <= 80 and not re.match(r"^\d", next_line):
                    title = next_line
                    consumed = 2

            # Check if rest contained content beyond the title
            if "." in title:
                parts = title.split(".", 1)
                title = parts[0].strip()
                remainder = parts[1].strip()

            clause_id = f"ART-{art_num}"
            return (clause_id, title if title else f"Article {art_num}", remainder, consumed)

        # Check 2: Explicit Section (e.g. "SECTION 1.1 Confidentiality", "Section 2.3")
        m_sec = RE_EXPLICIT_SECTION.match(clean_line)
        if m_sec:
            sec_num = m_sec.group(1).strip()
            rest = m_sec.group(2).strip()
            consumed = 1
            title = rest
            remainder = ""

            if not title and line_idx + 1 < len(lines):
                next_line = lines[line_idx + 1].strip()
                if len(next_line) <= 80 and not re.match(r"^\d", next_line):
                    title = next_line
                    consumed = 2

            if "." in title:
                parts = title.split(".", 1)
                title = parts[0].strip()
                remainder = parts[1].strip()

            clause_id = f"SEC-{sec_num}"
            return (clause_id, title if title else f"Section {sec_num}", remainder, consumed)

        # Check 3: Numeric Section (e.g. "1.1 Confidential Information.", "2.3 Term")
        m_num = RE_NUMERIC_SECTION.match(clean_line)
        if m_num:
            sec_num = m_num.group(1).strip()
            rest = m_num.group(2).strip()
            consumed = 1
            title = rest
            remainder = ""

            # Usually formatted as "1.1 Title. Body text begins here..."
            if "." in title:
                parts = title.split(".", 1)
                # First part is title, remainder is start of content
                title = parts[0].strip()
                remainder = parts[1].strip()

            clause_id = f"SEC-{sec_num}"
            return (clause_id, title if title else f"Section {sec_num}", remainder, consumed)

        # Check 4: Single Numeric Section (e.g. "1. DEFINITIONS", "2. Scope of Agreement")
        m_snum = RE_SINGLE_NUM_SECTION.match(clean_line)
        if m_snum:
            sec_num = m_snum.group(1).strip()
            rest = m_snum.group(2).strip()
            consumed = 1
            title = rest
            remainder = ""

            if "." in title:
                parts = title.split(".", 1)
                title = parts[0].strip()
                remainder = parts[1].strip()

            clause_id = f"SEC-{sec_num}"
            return (clause_id, title if title else f"Section {sec_num}", remainder, consumed)

        # Check 5: Clause (e.g. "CLAUSE 3.1", "Clause 4 - Termination")
        m_clause = RE_CLAUSE.match(clean_line)
        if m_clause:
            clause_num = m_clause.group(1).strip()
            rest = m_clause.group(2).strip()
            consumed = 1
            title = rest
            remainder = ""

            if not title and line_idx + 1 < len(lines):
                next_line = lines[line_idx + 1].strip()
                if len(next_line) <= 80 and not re.match(r"^\d", next_line):
                    title = next_line
                    consumed = 2

            if "." in title:
                parts = title.split(".", 1)
                title = parts[0].strip()
                remainder = parts[1].strip()

            clause_id = f"CLAUSE-{clause_num}"
            return (clause_id, title if title else f"Clause {clause_num}", remainder, consumed)

        # Check 6: Special Division (Recitals, Preamble, Schedule A, Exhibit 1, Appendix)
        m_spec = RE_SPECIAL_DIVISION.match(clean_line)
        if m_spec:
            div_name = m_spec.group(1).strip().upper()
            rest = m_spec.group(2).strip()
            consumed = 1
            title = div_name
            remainder = rest

            # Create clean clause_id
            if "SCHEDULE" in div_name:
                suffix = div_name.replace("SCHEDULE", "").strip()
                clause_id = f"SCHED-{suffix}" if suffix else "SCHEDULE"
            elif "EXHIBIT" in div_name:
                suffix = div_name.replace("EXHIBIT", "").strip()
                clause_id = f"EXHIBIT-{suffix}" if suffix else "EXHIBIT"
            elif "APPENDIX" in div_name:
                suffix = div_name.replace("APPENDIX", "").strip()
                clause_id = f"APP-{suffix}" if suffix else "APPENDIX"
            elif "ANNEX" in div_name:
                suffix = div_name.replace("ANNEX", "").strip()
                clause_id = f"ANNEX-{suffix}" if suffix else "ANNEX"
            elif "RECITALS" in div_name:
                clause_id = "RECITALS"
            elif "PREAMBLE" in div_name:
                clause_id = "PREAMBLE"
            else:
                clause_id = div_name.replace(" ", "-")

            return (clause_id, title, remainder, consumed)

        return None
