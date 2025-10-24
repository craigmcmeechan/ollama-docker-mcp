# Database Schema Documentation

Comprehensive database design for the Ollama MCP system, supporting conversations, embeddings, and knowledge base management.

## Overview

The system uses three primary databases:

1. **SQLite** (in MCP container): Configuration, model inventory, health logs
2. **PostgreSQL** (external): Embeddings, conversations, knowledge sources
3. **Filesystem** (via MCP): Original media, raw content, audit trails

---

## SQLite Configuration Database

**Location**: `/app/config.db` (in Docker container)  
**Purpose**: MCP internal state, configuration, health checks  
**Persistence**: Volume-mounted to host

### Tables

#### `models` Table

Tracks all Ollama models discovered on startup and runtime.

```sql
CREATE TABLE models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_name TEXT UNIQUE NOT NULL,
  model_type TEXT NOT NULL,  -- 'embedding', 'reasoning', 'multi-modal', 'unknown'
  
  -- Discovery metadata
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Lifecycle
  is_available BOOLEAN DEFAULT 1,
  disabled_at TIMESTAMP,  -- When model became unavailable
  disabled_reason TEXT,
  
  -- Properties
  embedding_dimensions INTEGER,  -- e.g., 384 for nomic-embed-text
  quantization TEXT,  -- e.g., 'Q4_0', 'Q5_K_M'
  parameters TEXT,  -- Model size, e.g., '7B', '13B'
  
  -- Properties assigned by user
  is_default_embedding BOOLEAN DEFAULT 0,
  is_default_reasoning BOOLEAN DEFAULT 0,
  
  -- Performance metrics
  avg_generation_time_ms FLOAT,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  
  -- Metadata
  tags TEXT,  -- JSON array: ['fast', 'accurate', 'experimental']
  custom_properties TEXT,  -- JSON object for user extensions
  notes TEXT,
  
  -- Auditing
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT DEFAULT 'system'
);

CREATE INDEX idx_models_type ON models(model_type);
CREATE INDEX idx_models_available ON models(is_available);
CREATE INDEX idx_models_embedding ON models(is_default_embedding);
```

#### `model_properties` Table

Assigns capabilities to models for intelligent routing.

```sql
CREATE TABLE model_properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_name TEXT NOT NULL,
  property_key TEXT NOT NULL,
  property_value TEXT NOT NULL,
  set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  set_by TEXT DEFAULT 'user',
  FOREIGN KEY(model_name) REFERENCES models(model_name) ON DELETE CASCADE,
  UNIQUE(model_name, property_key)
);

-- Examples:
-- (llama2, 'reasoning_quality', 'high')
-- (nomic-embed-text, 'embedding_dimensions', '384')
-- (gpt4-vision, 'modalities', 'text,image')
```

#### `health_checks` Table

Logs Ollama connectivity and health status.

```sql
CREATE TABLE health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL,  -- 'startup', 'periodic', 'manual', 'error'
  status TEXT NOT NULL,  -- 'healthy', 'warning', 'error'
  ollama_host TEXT,
  models_available INTEGER,
  error_message TEXT,
  details TEXT  -- JSON with additional info
);

CREATE INDEX idx_health_recent ON health_checks(check_timestamp DESC);
```

#### `configuration` Table

Persists runtime configuration overrides.

```sql
CREATE TABLE configuration (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL,
  config_type TEXT,  -- 'string', 'integer', 'boolean', 'json'
  set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  set_by TEXT DEFAULT 'startup',
  notes TEXT
);

-- Examples:
-- ('embedding_model_default', 'nomic-embed-text')
-- ('postgres_batch_size', '100')
-- ('web_fetch_timeout_ms', '30000')
```

---

## PostgreSQL Embeddings Database

**Location**: External PostgreSQL instance  
**Connection**: Direct from MCP via DATABASE_URL env var  
**Extensions Required**: `pgvector`

### Schema

#### `conversations` Table

Tracks conversation sessions for context linking.

```sql
CREATE TABLE conversations (
  conversation_id TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  name TEXT,  -- Optional user-provided name
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- User tags, custom fields
  message_count INTEGER DEFAULT 0,
  memory_count INTEGER DEFAULT 0,
  
  -- Lifecycle
  is_active BOOLEAN DEFAULT 1,
  archived_at TIMESTAMP
);

CREATE INDEX idx_conversations_created ON conversations(created_at DESC);
CREATE INDEX idx_conversations_active ON conversations(is_active);
```

#### `memories` Table (Core)

Stores embeddings from conversations, linked to sources.

```sql
CREATE TABLE memories (
  memory_id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  
  -- Embedding data
  embedding vector(384),  -- Dimension depends on model, 384 for nomic-embed-text
  embedding_model TEXT NOT NULL,  -- e.g., 'nomic-embed-text'
  embedding_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Content
  content TEXT NOT NULL,
  content_summary TEXT,  -- Auto-generated or user-provided
  content_tokens INTEGER,  -- Approximate token count
  
  -- Source tracking
  source_type TEXT,  -- 'conversation', 'web', 'file', 'knowledge_base'
  source_id TEXT,  -- Reference to Knowledge Source
  original_context TEXT,  -- Original surrounding context
  
  -- Metadata
  tags JSONB DEFAULT '{}'::jsonb,  -- Semantic tags
  metadata JSONB DEFAULT '{}'::jsonb,  -- Custom fields
  
  -- Temporal
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP,
  
  -- Lifecycle & relevance
  access_count INTEGER DEFAULT 0,
  relevance_score FLOAT DEFAULT 1.0,  -- Decays over time
  is_archived BOOLEAN DEFAULT 0,
  
  FOREIGN KEY(conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);

-- Vector similarity search index
CREATE INDEX memories_embedding_idx 
  ON memories USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX idx_memories_conversation ON memories(conversation_id);
CREATE INDEX idx_memories_created ON memories(created_at DESC);
CREATE INDEX idx_memories_relevance ON memories(relevance_score DESC);
CREATE INDEX idx_memories_source ON memories(source_type, source_id);
```

#### `knowledge_sources` Table

Tracks external knowledge sources (web pages, files, etc).

```sql
CREATE TABLE knowledge_sources (
  source_id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,  -- 'webpage', 'pdf_file', 'text_file', 'spreadsheet', 'markdown'
  source_url_or_path TEXT NOT NULL,  -- URL or file path
  
  -- Indexing status
  status TEXT DEFAULT 'pending',  -- 'pending', 'indexing', 'indexed', 'failed', 'stale'
  indexed_at TIMESTAMP,
  last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TIMESTAMP,  -- Last update detected in source
  
  -- Content tracking
  content_hash TEXT UNIQUE,  -- SHA256 of content for change detection
  previous_hash TEXT,  -- Previous hash to track changes
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- Extracted metadata (author, title, etc)
  file_metadata JSONB DEFAULT '{}'::jsonb,  -- EXIF, dates, permissions
  
  -- Statistics
  total_chunks INTEGER DEFAULT 0,
  total_embeddings INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Filesystem tracking
  filesystem_path TEXT,  -- Where this source is stored locally via filesystem MCP
  
  -- Lifecycle
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT DEFAULT 'system',
  disabled_at TIMESTAMP,
  disabled_reason TEXT
);

CREATE INDEX idx_sources_status ON knowledge_sources(status);
CREATE INDEX idx_sources_type ON knowledge_sources(source_type);
CREATE INDEX idx_sources_updated ON knowledge_sources(last_updated_at);
```

#### `embedding_chunks` Table

Detailed chunk-level tracking for knowledge base.

```sql
CREATE TABLE embedding_chunks (
  chunk_id BIGSERIAL PRIMARY KEY,
  source_id TEXT NOT NULL,
  
  -- Chunk identification
  chunk_number INTEGER NOT NULL,  -- Sequential number within source
  chunk_type TEXT DEFAULT 'text',  -- 'text', 'table', 'code', 'image'
  
  -- Content
  content TEXT NOT NULL,
  content_hash TEXT,  -- For detecting changes
  content_tokens INTEGER,  -- Token count of this chunk
  
  -- Embedding
  embedding vector(384),
  embedding_model TEXT NOT NULL,
  
  -- Position in source
  start_offset INTEGER,  -- Character position in original
  end_offset INTEGER,
  page_number INTEGER,  -- For PDFs
  
  -- Relationships
  parent_chunk_id BIGINT,  -- For hierarchical chunks
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Temporal
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TIMESTAMP,
  
  -- Quality
  quality_score FLOAT,  -- 0-1, how well this chunk was indexed
  
  FOREIGN KEY(source_id) REFERENCES knowledge_sources(source_id) ON DELETE CASCADE
);

CREATE INDEX chunks_embedding_idx 
  ON embedding_chunks USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 50);

CREATE INDEX idx_chunks_source ON embedding_chunks(source_id, chunk_number);
CREATE INDEX idx_chunks_created ON embedding_chunks(created_at);
```

#### `indexing_jobs` Table

Tracks knowledge base indexing operations.

```sql
CREATE TABLE indexing_jobs (
  job_id BIGSERIAL PRIMARY KEY,
  source_id TEXT NOT NULL,
  
  -- Job tracking
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
  
  -- Results
  chunks_created INTEGER DEFAULT 0,
  embeddings_created INTEGER DEFAULT 0,
  tokens_processed INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0,
  
  -- Metadata
  job_type TEXT DEFAULT 'initial_index',  -- 'initial_index', 'reindex', 'update'
  error_message TEXT,
  notes TEXT,
  
  FOREIGN KEY(source_id) REFERENCES knowledge_sources(source_id) ON DELETE CASCADE
);

CREATE INDEX idx_jobs_status ON indexing_jobs(status);
CREATE INDEX idx_jobs_source ON indexing_jobs(source_id);
```

---

## Search Queries

### Semantic Search

```sql
-- Find similar memories by embedding
SELECT 
  memory_id,
  content,
  (embedding <-> $1::vector) AS distance,
  relevance_score,
  created_at
FROM memories
WHERE conversation_id = $2
  AND is_archived = false
ORDER BY distance
LIMIT $3;
```

### Search with Metadata Filtering

```sql
-- Search memories tagged with specific tags
SELECT 
  memory_id,
  content,
  (embedding <-> $1::vector) AS distance
FROM memories
WHERE tags @> $2::jsonb  -- Contains specific tags
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY distance
LIMIT 10;
```

### Knowledge Base Chunk Search

```sql
-- Search knowledge base chunks
SELECT 
  ec.chunk_id,
  ec.content,
  ks.source_url_or_path,
  (ec.embedding <-> $1::vector) AS distance,
  ec.quality_score
FROM embedding_chunks ec
JOIN knowledge_sources ks ON ec.source_id = ks.source_id
WHERE ks.status = 'indexed'
ORDER BY distance
LIMIT 5;
```

---

## Indexes Summary

| Table | Index | Purpose | Query Speed Impact |
|-------|-------|---------|-------------------|
| memories | embedding_idx | Vector similarity search | Critical (10-20ms for 1M rows) |
| embedding_chunks | chunks_embedding_idx | KB vector search | Critical |
| conversations | idx_created | Recent conversations | Important |
| memories | idx_relevance | Relevance ranking | Important |
| knowledge_sources | idx_status | Filter by indexing status | Important |
| models (SQLite) | idx_available | Model availability | Minor |

---

## Initial Setup SQL

```sql
-- Create extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Run all CREATE TABLE statements from above
-- Grant appropriate permissions
GRANT USAGE ON SCHEMA public TO ollama_mcp_user;
GRANT CREATE ON SCHEMA public TO ollama_mcp_user;

-- Create indexes after tables exist
-- (see above for CREATE INDEX statements)
```

---

**Document Version**: 1.0  
**Updated**: 2025-10-24  
**Next Review**: After Phase 2 implementation
