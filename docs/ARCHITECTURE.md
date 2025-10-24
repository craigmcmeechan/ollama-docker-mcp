# Architecture Documentation

## System Architecture Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Desktop                            │
│  (MCP Client with context window management)                │
└────────┬────────────────────────────────────────────┬────────┘
         │                                            │
         │ (stdio connections)                        │
         │                                            │
    ┌────▼─────────┐  ┌──────────────┐  ┌───────────▼──┐
    │  Filesystem  │  │   Postgres   │  │   Ollama     │
    │  MCP Docker  │  │   MCP        │  │   MCP        │
    │              │  │   Docker     │  │   Docker     │
    │ /local-dir   │  │              │  │              │
    │ operations   │  │ SQL + Vector │  │ LLM + Embed  │
    └──────────────┘  └──────────────┘  └───────────────┘
         │                    │                   │
         │                    │                   │
    ┌────▼──────┐      ┌─────▼──────┐     ┌─────▼─────┐
    │  Windows  │      │ PostgreSQL  │     │  Ollama   │
    │  File     │      │  Container  │     │  (Host)   │
    │  System   │      │  + pgvector │     │  GPU      │
    └───────────┘      └─────────────┘     └───────────┘
```

### Data Flow Layers

**Layer 1: API & Interface**
- Claude Desktop (MCP Client)
- Stdin/stdout communication
- Tool discovery and invocation

**Layer 2: MCP Servers**
- Docker-containerized
- Isolated environments
- Host access via host.docker.internal

**Layer 3: Infrastructure**
- File system storage
- PostgreSQL database
- Ollama instance

---

## Ollama MCP Server Architecture

### Server Design Pattern

```typescript
// MCP Server Structure
Server {
  name: "ollama-mcp-server"
  version: "1.0.0"
  
  Tools: {
    Model Management: [list_models, get_model_info, pull_model, delete_model],
    Embeddings: [generate_embedding, batch_embeddings],
    Generation: [generate_completion],
    Health: [check_ollama_health]
  }
}
```

### Request/Response Flow

```
Claude Desktop
      │
      ├─ Call Tool: generate_embedding(model, text)
      │
      └─→ Ollama MCP Server (Docker)
           │
           ├─ Parse request
           │
           ├─ Validate inputs
           │
           ├─ Call Ollama API
           │    └─→ http://host.docker.internal:11434/api/embed
           │
           ├─ Process response
           │
           └─ Return to Claude
                └─→ { embedding: [...], dimension: 384 }
```

### Error Handling Strategy

```
┌─ Input Validation Error
│   └─ Return immediately with error message
│
├─ Ollama Connection Error
│   ├─ Retry 3 times with backoff
│   └─ Return health check suggestion
│
├─ Model Not Found
│   ├─ Suggest: ollama pull {model}
│   └─ Offer to auto-pull (future)
│
└─ Request Timeout
    └─ Return partial result or error
```

---

## Vector Database Architecture

### PostgreSQL + pgvector Setup

```sql
-- Core Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Memory Storage Table
CREATE TABLE memories (
  id BIGSERIAL PRIMARY KEY,
  embedding vector(384),      -- Immutable once set
  content TEXT NOT NULL,
  tags JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ...
);

-- Vector Index (IVFFlat for speed)
CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Search Query Patterns

**Similarity Search (Most Common)**
```sql
SELECT id, content, embedding <-> query_embedding AS distance
FROM memories
ORDER BY distance
LIMIT 5;
```

**Filtered Search**
```sql
SELECT id, content
FROM memories
WHERE tags @> '"important"'::jsonb
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY embedding <-> query_embedding
LIMIT 10;
```

### Index Strategy

| Index Type | Use Case | Query Speed | Build Time |
|------------|----------|-------------|------------|
| HNSW | Large indexes | Fast | Slow |
| IVFFlat | Medium indexes | Very Fast | Fast |
| Exact (None) | Small/precise | Slowest | N/A |

**Choice**: IVFFlat (balance of speed and build time)

---

## Memory System Architecture (Phase 2)

### Memory Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                 MEMORY LIFECYCLE                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. CAPTURE                                            │
│     ├─ Conversation happens                            │
│     ├─ Claude extracts insights                        │
│     └─ Generate embeddings                             │
│                                                         │
│  2. STORE                                              │
│     ├─ Insert into PostgreSQL                          │
│     ├─ Index in vector space                           │
│     └─ Tag with metadata                               │
│                                                         │
│  3. RETRIEVE                                           │
│     ├─ Query vector search                             │
│     ├─ Rank by relevance                               │
│     └─ Inject into context                             │
│                                                         │
│  4. USE                                                │
│     ├─ Claude processes with context                   │
│     ├─ Updates access metadata                         │
│     └─ May generate new insights                       │
│                                                         │
│  5. DECAY                                              │
│     ├─ Old memories fade relevance                     │
│     ├─ Low-access memories deprioritized               │
│     └─ Periodic cleanup                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Metadata Strategy

```json
{
  "memory": {
    "temporal": {
      "created_at": "2025-10-24T10:00:00Z",
      "last_accessed": "2025-10-24T15:30:00Z",
      "access_count": 3
    },
    "semantic": {
      "tags": ["preference", "programming", "user-profile"],
      "entities": ["TypeScript", "React"],
      "sentiment": "positive"
    },
    "quality": {
      "relevance_score": 0.95,
      "confidence": 0.9,
      "validation": "auto-extracted"
    },
    "source": {
      "type": "conversation",
      "conversation_id": "conv_12345",
      "context_length": 2000
    }
  }
}
```

---

## Context Management Architecture (Phase 3)

### Context Window Management

```
┌─────────────────────────────────────┐
│   Total Token Budget: ~8000         │
├─────────────────────────────────────┤
│                                     │
│  System Prompt       [████ 500]     │
│  Current Message    [███████ 1000]  │
│  Available          [█████████ 6500]│
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Memory Injection Strategy  │   │
│  ├─────────────────────────────┤   │
│  │ 1. Semantic search: 20 tokens   │
│  │ 2. Rank by relevance            │
│  │ 3. Fill 6500 token budget       │
│  │ 4. Compress if needed           │
│  │ 5. Inject in order of priority  │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Ranking Algorithm

```
Memory Rank Score = 
  (Relevance * 0.40) +        // Vector similarity to query
  (Recency * 0.30) +          // How recent the memory
  (Frequency * 0.20) +        // How often used
  (Importance * 0.10)         // User-marked importance

Example:
  Memory A: rel=0.9, rec=0.7, freq=0.5, imp=0.8
  Score = (0.9 * 0.4) + (0.7 * 0.3) + (0.5 * 0.2) + (0.8 * 0.1)
        = 0.36 + 0.21 + 0.1 + 0.08 = 0.75
```

---

## Deployment Architecture

### Docker Compose Stack

```yaml
services:
  ollama-mcp:
    # Ollama MCP proxy server
    image: ollama-mcp-server:latest
    environment:
      - OLLAMA_HOST=http://host.docker.internal:11434
    stdin_open: true
    tty: true

  postgres:
    # PostgreSQL with pgvector
    image: pgvector/pgvector:latest
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  filesystem:
    # File access MCP (already exists)
    image: mcp/filesystem:latest
    volumes:
      - D:\MyClaudeData:/local-directory
```

### Network Architecture

```
Windows Host
├─ Ollama: 127.0.0.1:11434
│
└─ Docker Network (bridge)
   ├─ Ollama MCP Container
   │  └─ Connects via host.docker.internal:11434
   ├─ PostgreSQL Container
   │  └─ Port 5432 exposed
   └─ Filesystem Container
      └─ Volume mounts to host
```

---

## Performance Considerations

### Latency Budget

```
Embedding Generation:
  Model load:        ~100ms (first time)
  Forward pass:      ~50ms
  Total:             ~50-150ms

Vector Search (10k memories):
  IVFFlat index:     ~5-20ms
  Fetch results:     ~5ms
  Total:             ~10-25ms

Memory Storage:
  Insert:            ~10ms
  Index update:      ~20ms
  Total:             ~30-50ms

End-to-End (embedding + search + inject):
  Total time:        ~100-200ms
```

### Scaling Considerations

| Scale | Memories | Search Time | Storage |
|-------|----------|-------------|----------|
| Small | <1k | <5ms | <50MB |
| Medium | 10k | 10-20ms | <500MB |
| Large | 100k | 20-50ms | <5GB |
| Huge | 1M | 50-100ms | <50GB |

---

## Security Architecture

### Isolation

1. **Container Isolation**
   - Each MCP server in own container
   - Limited resource allocation
   - No cross-container access

2. **Network Security**
   - host.docker.internal only for Ollama
   - No external network access
   - Firewall rules enforced

3. **File Access**
   - Limited to /local-directory
   - No system directory access
   - All access logged

### Data Privacy

- All processing local
- No external API calls
- Memories stored locally
- No data export without explicit action

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-24  
**Next Review**: After Phase 1 Sprint
