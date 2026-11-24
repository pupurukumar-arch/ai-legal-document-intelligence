#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"

docker run --name lexguard-postgres \
  -e POSTGRES_DB=legal_ai_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v "${project_dir}/backend-api/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro" \
  -d pgvector/pgvector:pg16
