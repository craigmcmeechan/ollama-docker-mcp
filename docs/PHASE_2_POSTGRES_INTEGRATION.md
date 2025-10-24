# Phase 2: PostgreSQL Integration & Embedding Storage

**Scope**: Connect Ollama MCP to PostgreSQL with vector search capabilities  
**Duration**: 2-3 weeks  
**Prerequisites**: Phase 1 complete, PostgreSQL + pgvector running  
**Deliverable**: Embeddings stored and searchable via semantic search  

---

## Overview

Phase 2 adds the critical knowledge storage layer:
- Direct PostgreSQL connection with pgvector
- Embedding generation and storage
- Semantic similarity search
- Conversation linking
- Query filtering and ranking

---

## Phase 2 Goals

✅ **Goal 1**: Ollama MCP connects directly to PostgreSQL  
✅ **Goal 2**: Embeddings stored with full metadata  
✅ **Goal 3**: Semantic search returns ranked results  
✅ **Goal 4**: Conversations tracked and linked  
✅ **Goal 5**: Tools handle batch operations efficiently  

---

## Environment Variables (Extended from Phase 1)

Add these to Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "ollama": {
      "env": {
        "OLLAMA_HOST": "http://host.docker.internal:11434",
        "LOG_LEVEL": "info",
        
        "DATABASE_URL": "postgresql://ollama_user:password@host.docker.internal:5432/ollama_kb",
        "POSTGRES_HOST": "host.docker.internal",
        "POSTGRES_PORT": "5432",
        "POSTGRES_USER": "ollama_user",
        "POSTGRES_PASSWORD": "secure_password",
        "POSTGRES_DB": "ollama_kb",
        
        "DB_POOL_SIZE": "10",
        "DB_CONNECTION_TIMEOUT_MS": "5000",
        "DB_QUERY_TIMEOUT_MS": "30000",
        
        "DEFAULT_EMBEDDING_MODEL": "nomic-embed-text",
        "EMBEDDING_BATCH_SIZE": "10"
      }
    }
  }
}
```

**New Environment Variables**:

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | - | PostgreSQL connection string |
| POSTGRES_HOST | localhost | Postgres hostname |
| POSTGRES_PORT | 5432 | Postgres port |
| POSTGRES_USER | postgres | Database user |
| POSTGRES_PASSWORD | - | Database password |
| POSTGRES_DB | ollama_kb | Database name |
| DB_POOL_SIZE | 10 | Connection pool size |
| DB_CONNECTION_TIMEOUT_MS | 5000 | Connection timeout |
| DB_QUERY_TIMEOUT_MS | 30000 | Query timeout |
| DEFAULT_EMBEDDING_MODEL | nomic-embed-text | Model for embeddings |
| EMBEDDING_BATCH_SIZE | 10 | Batch embedding size |

---

## PostgreSQL Setup

### Prerequisites

```bash
# Ensure pgvector extension is installed
# In PostgreSQL:
CREATE EXTENSION IF NOT EXISTS vector;

# Create user and database
CREATE USER ollama_user WITH PASSWORD 'secure_password';
CREATE DATABASE ollama_kb OWNER ollama_user;
GRANT ALL PRIVILEGES ON DATABASE ollama_kb TO ollama_user;
```

### Schema Creation

Phase 2 creates these tables (see DATABASE_SCHEMA.md for full specs):

```sql
-- Primary tables
CREATE TABLE conversations (...);
CREATE TABLE memories (...);
CREATE TABLE knowledge_sources (...);
CREATE TABLE embedding_chunks (...);
CREATE TABLE indexing_jobs (...);

-- Indexes for performance
CREATE INDEX memories_embedding_idx ON memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX chunks_embedding_idx ON embedding_chunks USING ivfflat (embedding vector_cosine_ops);
-- ... additional indexes
```

---

## New Tools (Phase 2)

### Tool 1: `init_conversation`

**Status**: New  
**Purpose**: Create a new conversation session for memory linking

```typescript
Tool: init_conversation
Input: {
  name?: string,
  metadata?: object
}
Output: {
  conversation_id: string,
  created_at: string,
  status: string
}
```

**Implementation**:
- Generate unique conversation_id (UUID)
- INSERT into conversations table
- Store in PostgreSQL
- Return conversation_id

**Why**: All memories need a conversation context. This tool creates that context.

---

### Tool 2: `store_memory`

**Status**: New  
**Purpose**: Store embedding with metadata in PostgreSQL

```typescript
Tool: store_memory
Input: {
  conversation_id: string,
  content: string,
  embedding?: number[],  // If pre-computed
  tags?: string[],
  metadata?: object,
  source_type?: string  // 'conversation', 'web', 'file'
}
Output: {
  memory_id: number,
  stored_at: string,
  embedding_dimension: number,
  similarity_to_existing?: number
}
```

**Implementation**:
- If no embedding provided, call generate_embedding
- Check for similar existing memories (deduplication)
- INSERT into memories table
- Return memory_id

**Example Claude Usage**:
```
Claude: "I want to remember that TypeScript is preferred."
[Calls: store_memory(
  conversation_id: "conv_123",
  content: "User prefers TypeScript for type safety",
  tags: ["preference", "programming"]
)]
Response: {memory_id: 456, stored_at: "2025-10-24T..."}
```

---

### Tool 3: `search_memories`

**Status**: New  
**Purpose**: Semantic search for memories within a conversation

```typescript
Tool: search_memories
Input: {
  conversation_id: string,
  query: string,
  top_k?: number,  // Default: 5
  threshold?: number,  // Similarity threshold (default: 0.5)
  filters?: {
    tags?: string[],
    source_type?: string,
    after?: string,  // ISO timestamp
    before?: string
  }
}
Output: {
  results: Array<{
    memory_id: number,
    content: string,
    similarity: number,
    created_at: string,
    tags: string[]
  }>,
  search_time_ms: number,
  total_found: number
}
```

**Implementation**:
- Generate embedding for query
- Execute vector similarity search via pgvector
- Apply filters (tags, date range, etc)
- Rank by similarity
- Return top_k results

**SQL Query**:
```sql
SELECT 
  memory_id, content, tags,
  (embedding <-> $1::vector) AS distance,
  created_at
FROM memories
WHERE conversation_id = $2
  AND is_archived = false
  AND ($3::text IS NULL OR tags @> $3)
  AND created_at > $4
ORDER BY distance
LIMIT $5;
```

---

### Tool 4: `search_all_conversations`

**Status**: New  
**Purpose**: Cross-conversation semantic search

```typescript
Tool: search_all_conversations
Input: {
  query: string,
  top_k?: number,
  threshold?: number,
  exclude_conversation_id?: string
}
Output: {
  results: Array<{
    memory_id: number,
    conversation_id: string,
    content: string,
    similarity: number,
    created_at: string
  }>,
  conversations_searched: number,
  search_time_ms: number
}
```

**Why**: Build context from entire history, not just current conversation.

---

### Tool 5: `get_conversation_summary`

**Status**: New  
**Purpose**: Get statistics and summary of a conversation

```typescript
Tool: get_conversation_summary
Input: {
  conversation_id: string
}
Output: {
  conversation_id: string,
  created_at: string,
  name?: string,
  memory_count: number,
  last_activity: string,
  top_tags: string[],
  size_bytes: number,
  last_search_query?: string
}
```

---

### Tool 6: `update_memory_metadata`

**Status**: New  
**Purpose**: Update memory tags, relevance, or other metadata

```typescript
Tool: update_memory_metadata
Input: {
  memory_id: number,
  tags?: string[],
  metadata?: object,
  relevance_score?: number,
  archive?: boolean
}
Output: {
  success: boolean,
  memory_id: number,
  updated_fields: string[]
}
```

---

### Tool 7: `batch_store_memories`

**Status**: New  
**Purpose**: Efficiently store multiple embeddings

```typescript
Tool: batch_store_memories
Input: {
  conversation_id: string,
  memories: Array<{
    content: string,
    tags?: string[],
    metadata?: object
  }>
}
Output: {
  stored_count: number,
  total_count: number,
  memory_ids: number[],
  duration_ms: number
}
```

**Why**: When indexing knowledge bases (Phase 3), we need efficient bulk operations.

---

### Tool 8: `batch_search_memories`

**Status**: New  
**Purpose**: Search for multiple queries efficiently

```typescript
Tool: batch_search_memories
Input: {
  conversation_id: string,
  queries: string[],
  top_k?: number
}
Output: {
  results: Array<{
    query: string,
    matches: Array<{memory_id, similarity}>
  }>,
  search_time_ms: number
}
```

---

## Database Connection Management

### Connection Pool

```typescript
// Initialize on startup
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  max: parseInt(process.env.DB_POOL_SIZE || '10'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000'),
  idleTimeoutMillis: 30000,
  application_name: 'ollama_mcp_server'
});

// Health check
pool.query('SELECT 1', (err, res) => {
  if (err) {
    console.error('PostgreSQL connection failed', err);
    logToHealthChecks('postgres_connection_failed', err.message);
  } else {
    console.log('PostgreSQL connected');
    logToHealthChecks('postgres_connected', 'success');
  }
});
```

### Error Handling

```typescript
try {
  const result = await pool.query(sqlQuery, values);
  return result.rows;
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    // Postgres offline
    logError('PostgreSQL offline', error);
    returnToolError('Database connection failed. Is PostgreSQL running?');
  } else if (error.code === '42P01') {
    // Table doesn't exist
    logError('Schema not initialized', error);
    returnToolError('Database schema not initialized. Run setup first.');
  } else if (error.code === 'ETIMEDOUT') {
    logError('Query timeout', error);
    returnToolError('Database query timed out');
  } else {
    logError('Unknown database error', error);
    throw error;
  }
}
```

---

## Migration Strategy

### Auto-initialization

On first connection:

```typescript
async function initializeSchema() {
  const existingTables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  
  if (existingTables.rows.length === 0) {
    // First time - create all tables
    await pool.query(FULL_SCHEMA_SQL);
    logToHealthChecks('schema_initialized', 'created');
  } else {
    // Schema already exists
    // Could implement migration logic here
    logToHealthChecks('schema_verified', 'exists');
  }
}
```

---

## Performance Optimization

### Vector Index Tuning

```sql
-- For small indexes (< 10k embeddings)
CREATE INDEX memories_embedding_idx 
  ON memories USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- For large indexes (> 1M embeddings)
CREATE INDEX memories_embedding_idx 
  ON memories USING hnsw (embedding vector_cosine_ops);
```

### Query Optimization

```typescript
// Use prepared statements to avoid re-parsing
const searchQuery = `
  SELECT memory_id, content, (embedding <-> $1::vector) AS distance
  FROM memories
  WHERE conversation_id = $2
  ORDER BY distance
  LIMIT $3
`;

const stmt = await pool.prepare('search_memories', searchQuery);
// Reuse stmt for multiple queries
```

### Batch Operations

```typescript
// Insert multiple embeddings in single transaction
await pool.query('BEGIN');
try {
  for (const memory of memories) {
    await pool.query(insertMemorySql, insertMemoryValues);
  }
  await pool.query('COMMIT');
} catch (error) {
  await pool.query('ROLLBACK');
  throw error;
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test embedding generation
test('generate_embedding produces 384-dim vector', async () => {
  const result = await tool.generate_embedding('test', 'nomic-embed-text');
  expect(result.embedding.length).toBe(384);
});

// Test memory storage
test('store_memory inserts into PostgreSQL', async () => {
  const result = await tool.store_memory('conv_1', 'test content');
  expect(result.memory_id).toBeDefined();
});
```

### Integration Tests

```typescript
// Test end-to-end workflow
test('memory lifecycle: store -> search -> retrieve', async () => {
  // 1. Create conversation
  const conv = await tool.init_conversation('test');
  
  // 2. Store memory
  const mem = await tool.store_memory(conv.conversation_id, 'content');
  
  // 3. Search for memory
  const results = await tool.search_memories(conv.conversation_id, 'search query');
  
  // 4. Verify
  expect(results.results.length).toBeGreaterThan(0);
});
```

---

## Acceptance Criteria

✅ Ollama MCP connects to PostgreSQL on startup  
✅ Embeddings store with full metadata  
✅ Vector similarity search works  
✅ Semantic search returns ranked results  
✅ Conversations are tracked and linked  
✅ Batch operations are efficient (< 100ms for 10 items)  
✅ All tests pass  
✅ Documentation updated  

---

## Craig's Extended Thinking - Additional Phase 2 Features

Beyond requirements, I suggest:

### 1. Deduplication

**Why**: Don't store identical or near-identical embeddings.

```typescript
// Before storing new memory
const similarMemories = await tool.search_memories(
  conversation_id,
  content,
  top_k: 1,
  threshold: 0.95  // Very similar
);

if (similarMemories.results.length > 0) {
  return { error: 'Similar memory already exists' };
}
```

### 2. Relevance Decay

**Why**: Older memories should be weighted less in searches.

```sql
SELECT 
  memory_id,
  content,
  (embedding <-> $1::vector) * (1.0 / (1 + EXTRACT(DAY FROM AGE(NOW(), created_at))/30)) AS weighted_distance
FROM memories
ORDER BY weighted_distance
LIMIT 5;
```

### 3. Memory Statistics

**Why**: Track what's working.

```typescript
Tool: get_memory_statistics
Output: {
  total_memories: number,
  memories_by_source: object,
  avg_similarity_score: number,
  most_accessed_memories: Array,
  memory_growth_rate: number
}
```

---

**Document Version**: 1.0  
**Created**: 2025-10-24  
**Phase Duration**: 2-3 weeks  
**Next Phase**: Knowledge Base Integration (Phase 3)
