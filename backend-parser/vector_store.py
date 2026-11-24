"""Local ChromaDB store for semantic clause retrieval.

Chroma owns embeddings; the application keeps source text and graph edges in
PostgreSQL/Node. Retrieval returns only clause IDs and metadata, which Node
then uses to fetch evidence and expand dependency links.
"""
from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import chromadb

DATA_PATH = Path(__file__).resolve().parent / "chroma_data"
client = chromadb.PersistentClient(path=str(DATA_PATH))
clauses = client.get_or_create_collection(
    name="contract_clauses",
    metadata={"hnsw:space": "cosine"},
)
policy_sources = client.get_or_create_collection(
    name="legal_policy_sources",
    metadata={"hnsw:space": "cosine"},
)

def index_clauses(contract_id: str, document_type: str, items: List[Dict[str, Any]], filename: str = "contract.pdf") -> int:
    if not items:
        return 0
    ids, documents, metadatas = [], [], []
    for index, item in enumerate(items):
        clause_id = str(item.get("clause_id", "UNKNOWN"))
        # Clause IDs can repeat in imperfect PDFs (for example, multiple
        # preamble chunks). The vector document ID must remain unique.
        ids.append(f"{contract_id}:{clause_id}:{index}")
        documents.append(f"{item.get('section_title', '')}\n{item.get('content', '')}")
        metadatas.append({
            "contract_id": str(contract_id), "clause_id": clause_id,
            "document_type": str(document_type or "unknown"),
            "page_number": int(item.get("page_number") or 1),
            "section_title": str(item.get("section_title") or "Untitled Section"),
            "cross_references": json.dumps(item.get("cross_references") or []),
            "filename": str(filename),
            "clause_order": index,
        })
    clauses.upsert(ids=ids, documents=documents, metadatas=metadatas)
    return len(ids)

def search_clauses(query: str, contract_id: Optional[str], top_k: int = 3) -> List[Dict[str, Any]]:
    where = {"contract_id": str(contract_id)} if contract_id else None
    result = clauses.query(query_texts=[query], n_results=max(1, min(top_k, 10)), where=where)
    ids = result.get("ids", [[]])[0]
    metadata = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]
    return [{"vector_id": item_id, "clause_id": meta.get("clause_id"), "contract_id": meta.get("contract_id"), "score": round(1 - float(distance), 4), "page_number": meta.get("page_number")} for item_id, meta, distance in zip(ids, metadata, distances)]

def get_contract_clauses(contract_id: str) -> List[Dict[str, Any]]:
    result = clauses.get(where={"contract_id": str(contract_id)}, include=["documents", "metadatas"])
    entries = []
    for vector_id, document, meta in zip(result.get("ids", []), result.get("documents", []), result.get("metadatas", [])):
        title = meta.get("section_title") or "Untitled Section"
        prefix = f"{title}\n"
        content = document[len(prefix):] if document.startswith(prefix) else document
        entries.append({"id": vector_id, "contract_id": meta.get("contract_id"), "clause_id": meta.get("clause_id"), "section_title": title, "page_number": meta.get("page_number"), "content": content, "cross_references": json.loads(meta.get("cross_references") or "[]"), "filename": meta.get("filename"), "document_type": meta.get("document_type"), "clause_order": meta.get("clause_order", 0)})
    return sorted(entries, key=lambda item: item["clause_order"])

def list_contracts() -> List[Dict[str, Any]]:
    result = clauses.get(include=["metadatas"])
    contracts: Dict[str, Dict[str, Any]] = {}
    for meta in result.get("metadatas", []):
        contract_id = meta.get("contract_id")
        if contract_id not in contracts:
            contracts[contract_id] = {"id": contract_id, "filename": meta.get("filename"), "document_type": meta.get("document_type"), "total_clauses": 0}
        contracts[contract_id]["total_clauses"] += 1
    return list(contracts.values())

def delete_contract(contract_id: str) -> int:
    """Remove every vector record for one uploaded contract."""
    existing = clauses.get(where={"contract_id": str(contract_id)}, include=[])
    removed = len(existing.get("ids", []))
    if removed:
        clauses.delete(where={"contract_id": str(contract_id)})
    return removed

def index_policy_sources(items: List[Dict[str, Any]]) -> int:
    if not items:
        return 0
    ids, documents, metadatas = [], [], []
    for item in items:
        source_id = str(item["source_id"])
        ids.append(f"policy:{source_id}")
        documents.append(str(item["content"]))
        metadatas.append({"document_type": str(item["document_type"]), "clause_type": str(item["clause_type"]), "label": str(item["label"])})
    policy_sources.upsert(ids=ids, documents=documents, metadatas=metadatas)
    return len(ids)

def search_policy_sources(query: str, document_type: Optional[str], top_k: int = 3) -> List[Dict[str, Any]]:
    where = {"document_type": str(document_type)} if document_type else None
    result = policy_sources.query(query_texts=[query], n_results=max(1, min(top_k, 10)), where=where)
    ids, metadata, documents, distances = (result.get("ids", [[]])[0], result.get("metadatas", [[]])[0], result.get("documents", [[]])[0], result.get("distances", [[]])[0])
    return [{"source_id": item_id.replace("policy:", "", 1), "label": meta.get("label"), "clause_type": meta.get("clause_type"), "content": document, "score": round(1 - float(distance), 4)} for item_id, meta, document, distance in zip(ids, metadata, documents, distances)]
