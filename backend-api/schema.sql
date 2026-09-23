-- ============================================================================
-- AI Legal Document Intelligence Platform - Database Schema
-- Target: PostgreSQL 15+ with pgvector extension enabled
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Contracts Table
-- Stores metadata and lifecycle status for uploaded legal agreements
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    total_pages INT DEFAULT 0,
    total_clauses INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clauses Table
-- Stores structurally chunked legal clauses with 1536-dimensional vector embeddings
CREATE TABLE IF NOT EXISTS clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    clause_id VARCHAR(100) NOT NULL, -- Canonical hierarchy ID (e.g., 'SEC-1.1', 'ART-1', 'CLAUSE-2.3')
    section_title VARCHAR(255),
    page_number INT,
    content TEXT NOT NULL,
    cross_references TEXT[] DEFAULT '{}',
    embedding vector(1536),           -- Vector representation (e.g., OpenAI text-embedding-3-small or ada-002)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Clause Dependencies Table
-- Models directed dependency and cross-reference relationships between contract clauses
CREATE TABLE IF NOT EXISTS clause_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    source_clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
    target_clause_id UUID REFERENCES clauses(id) ON DELETE SET NULL,
    target_clause_code VARCHAR(100),  -- Raw or normalized reference code (e.g., 'Schedule A', 'Section 1.1')
    relation_type VARCHAR(100) NOT NULL DEFAULT 'CROSS_REFERENCE', -- 'CROSS_REFERENCE', 'AMENDS', 'GOVERNS', 'EXCLUDES', 'CONDITIONED_ON'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes for Performance & Vector Similarity Search
-- ============================================================================

-- Contract lookup indexes
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

-- Clause lookup indexes
CREATE INDEX IF NOT EXISTS idx_clauses_contract_id ON clauses(contract_id);
CREATE INDEX IF NOT EXISTS idx_clauses_clause_id ON clauses(clause_id);
CREATE INDEX IF NOT EXISTS idx_clauses_page_number ON clauses(page_number);

-- Full text search index for hybrid legal keyword retrieval
CREATE INDEX IF NOT EXISTS idx_clauses_content_fts ON clauses USING gin(to_tsvector('english', content));

-- Cosine distance vector index using HNSW (Hierarchical Navigable Small World)
-- For datasets with high queries-per-second, HNSW provides optimal recall and sub-millisecond latency
CREATE INDEX IF NOT EXISTS idx_clauses_embedding_hnsw 
ON clauses USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Dependency graph traversal indexes for multi-hop retrieval
CREATE INDEX IF NOT EXISTS idx_clause_deps_contract_id ON clause_dependencies(contract_id);
CREATE INDEX IF NOT EXISTS idx_clause_deps_source ON clause_dependencies(source_clause_id);
CREATE INDEX IF NOT EXISTS idx_clause_deps_target ON clause_dependencies(target_clause_id);
CREATE INDEX IF NOT EXISTS idx_clause_deps_relation ON clause_dependencies(relation_type);
