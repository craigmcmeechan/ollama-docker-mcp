# Feature Specification & Planning

Detailed specifications for all planned and implemented features.

## Table of Contents

1. [Core Embedding Pipeline](#core-embedding-pipeline)
2. [Vector Database Integration](#vector-database-integration)
3. [Memory System](#memory-system)
4. [Context Management](#context-management)
5. [Performance Features](#performance-features)

---

## Core Embedding Pipeline

### Feature: Single Text Embedding

**Status**: ✅ Complete  
**Tool Name**: `generate_embedding`  
**Priority**: Critical

**Description**:
Generates a vector embedding for a single text input using a local Ollama embedding model.

**Use Cases**:
- Convert memory to searchable vector
- Generate query embedding for search
- Encode new information for storage

**Technical Spec**:

```typescript
Input: {
  model: string,      // e.g., "nomic-embed-text"
  text: string        // Text to embed
}

Output: {
  embedding: number[],  // Vector of floats (384 for nomic-embed-text)
  dimension: number     // Vector size
}

Performance:
- Latency: 50-200ms (depends on GPU)
- Throughput: 5-10 embeddings/second
- Memory: ~100MB (model loaded once)
```

**Error Handling**:
- Model not found → Auto-pull or error message
- Text too long → Truncate or split
- Ollama offline → Clear error with recovery steps

**Future Enhancements**:
- Async batching
- Embedding caching
- Multiple model support
- Streaming for large texts

---

### Feature: Batch Embeddings

**Status**: ✅ Complete  
**Tool Name**: `batch_embeddings`  
**Priority**: High

**Description**:
Generates embeddings for multiple texts in sequence, more efficient than individual calls.

**Use Cases**:
- Process multiple memory items
- Prepare search queries
- Bulk import historical data

**Technical Spec**:

```typescript
Input: {
  model: string,
  texts: string[]     // Array of texts
}

Output: {
  embeddings: Array<{
    text: string,
    embedding: number[]
  }>
}

Performance (for 10 texts):
- Total Time: ~300-400ms (vs 500-2000ms individual)
- Improvement: 40-50% faster than sequential calls
```

**Optimizations**:
- Model loaded once, reused
- Connection pooling to Ollama
- Parallel processing potential

---

### Feature: Model Management

**Status**: ✅ Complete  
**Tools**: `list_models`, `get_model_info`, `pull_model`, `delete_model`  
**Priority**: Medium

**Description**:
Manage available models in the Ollama instance.

**Use Cases**:
- Check available embedding models
- Download new models
- Free up disk space
- Get model capabilities

**Supported Models**:

| Model | Type | Dimensions | Speed | Quality |
|-------|------|------------|-------|----------|
| nomic-embed-text | Embedding | 384 | Very Fast | Good |
| mxbai-embed-large | Embedding | 1024 | Fast | Excellent |
| llama2 | LLM | - | Medium | Good |
| mistral | LLM | - | Fast | Excellent |
| neural-chat | LLM | - | Very Fast | Good |

---

## Vector Database Integration

### Feature: Vector Storage (Phase 1 - In Progress)

**Status**: 🔄 In Progress  
**Tool Name**: `vector_insert` (planned)  
**Priority**: Critical  
**Target Completion**: Week 1

**Description**:
Store embeddings in PostgreSQL pgvector with associated metadata.

**Use Case Flow**:
```
1. Claude generates insight
2. Generate embedding via Ollama
3. Insert embedding + metadata into PostgreSQL
4. Memory persists for future retrieval
```

**Database Schema** (PostgreSQL):

```sql
CREATE TABLE memories (
  id BIGSERIAL PRIMARY KEY,
  
  -- Embedding data
  embedding vector(384),              -- Nomic embed dimension
  embedding_model VARCHAR(100),       -- Model used
  
  -- Content
  content TEXT,                       -- Original text
  summary TEXT,                       -- Optional summary
  
  -- Metadata
  tags JSONB,                         -- Semantic tags
  metadata JSONB,                     -- Custom metadata
  
  -- Temporal
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW(),
  access_count INT DEFAULT 0,
  relevance_score FLOAT DEFAULT 1.0,  -- Decay over time
  
  -- Source tracking
  source VARCHAR(100),                -- e.g., "conversation", "analysis"
  conversation_id VARCHAR(100),       -- Link to conversation
  
  INDEX ON (created_at),
  INDEX ON (access_count),
  INDEX ON (relevance_score)
);

CREATE INDEX memories_embedding_idx 
  ON memories USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
```

**Tool Specification**:

```typescript
Input: {
  embedding: number[],    // Vector from Ollama
  content: string,        // Original text
  model: string,          // Embedding model used
  tags?: string[],        // Optional semantic tags
  metadata?: object,      // Custom metadata
  source?: string         // e.g., "conversation"
}

Output: {
  id: number,             // Memory ID
  stored: boolean,
  timestamp: string
}
```

**Performance Requirements**:
- Insert latency: < 50ms
- Concurrent inserts: 10+ / second
- Disk footprint: ~4KB per memory (embedding + metadata)

---

### Feature: Vector Search (Phase 1 - In Progress)

**Status**: 🔄 In Progress  
**Tool Name**: `vector_search` (planned)  
**Priority**: Critical  
**Target Completion**: Week 1

**Description**:
Find semantically similar memories using vector similarity search.

**Use Case Flow**:
```
1. User asks a question
2. Generate embedding for question
3. Search PostgreSQL for similar memories
4. Claude incorporates relevant context
5. More informed response
```

**Search Algorithm**:
- Method: Cosine similarity (default)
- Index Type: IVFFlat (Inverted File Flat)
- Distance Metric: vector_cosine_ops
- Search Speed: ~5-20ms for ~10k memories

**Tool Specification**:

```typescript
Input: {
  embedding: number[],        // Query embedding
  top_k: number,              // Number of results (default: 5)
  threshold?: number,         // Minimum similarity (default: 0.5)
  filters?: {
    source?: string,
    tags?: string[],
    after?: Date,
    before?: Date
  }
}

Output: {
  results: Array<{
    id: number,
    content: string,
    similarity: number,        // 0-1 score
    created_at: string,
    tags: string[]
  }>,
  search_time_ms: number
}
```

**Query Examples**:

```
# Find recent relevant memories
vector_search(query_embedding, top_k=10, 
  filters={after: Date.now() - 24h})

# Find memories with specific tag
vector_search(query_embedding, top_k=5,
  filters={tags: ["important"]})

# High-confidence searches only
vector_search(query_embedding, threshold=0.8)
```

---

### Feature: Batch Search (Phase 1 - Planned)

**Status**: Planned  
**Tool Name**: `batch_search` (planned)  
**Priority**: Medium

**Description**:
Perform multiple vector searches efficiently.

**Use Cases**:
- Find context for multiple sub-queries
- Prepare comprehensive context
- Analyze related memories

---

## Memory System

### Feature: Semantic Memory Storage (Phase 2)

**Status**: Planned  
**Priority**: High

**Description**:
Automatically extract and store key insights as searchable memories.

**Auto-Extraction Strategy**:
1. After each interaction
2. Identify key facts/decisions
3. Extract structured insights
4. Generate embeddings
5. Store with tags

**Example Memory Lifecycle**:

```
Conversation:
  User: "I prefer using TypeScript for ML projects"
  
Extraction:
  - Fact: "User prefers TypeScript"
  - Context: "ML projects"
  - Confidence: 0.9
  
Memory Created:
  content: "User prefers TypeScript for machine learning projects"
  tags: ["preference", "programming", "user-profile"]
  source: "conversation"
  relevance_score: 1.0
  
Retrieval (future):
  User: "What language should I use?"
  → Search finds this memory
  → Claude recalls preference
```

---

### Feature: Memory Metadata (Phase 2)

**Status**: Planned  
**Priority**: High

**Types of Metadata**:

1. **Temporal**
   - created_at: When memory was formed
   - last_accessed: Last retrieval time
   - decay_rate: How quickly to deprioritize

2. **Semantic**
   - tags: Category labels
   - entities: Named entities mentioned
   - sentiment: Positive/negative/neutral

3. **Quality**
   - relevance_score: 0-1 importance
   - confidence: How sure we are
   - validation_level: Verified/unverified

4. **Source**
   - source: conversation/analysis/user-input
   - conversation_id: Link to conversation
   - context_window: Surrounding text

---

## Context Management

### Feature: Smart Context Injection (Phase 3)

**Status**: Planned  
**Priority**: High

**Problem**:
As conversations grow, we have:
- Limited context window
- Irrelevant historical data
- Missed important context

**Solution**:
Intelligently select and prioritize memories.

**Ranking Algorithm**:

```
rank = (relevance * 0.4) + 
       (recency * 0.3) + 
       (access_frequency * 0.2) + 
       (user_specified_importance * 0.1)

Where:
- relevance: Vector similarity to current query
- recency: How recent the memory
- access_frequency: How often we use it
- user_importance: User-marked importance
```

**Context Budget**:
- Total context window: ~8000 tokens
- System prompt: 500 tokens
- Current message: 1000 tokens
- Available for context: 6500 tokens
- Memory injection: Fill top 6500 tokens

---

### Feature: Context Compression (Phase 3)

**Status**: Planned  
**Priority**: Medium

**Problem**:
Multiple related memories take lots of space.

**Solution**:
Use local LLM to compress context.

**Example**:

```
Original Memories:
  1. "User prefers TypeScript" (50 tokens)
  2. "User uses React" (50 tokens)
  3. "User works with AI" (50 tokens)
  Total: 150 tokens
  
Compressed:
  "User is a TypeScript/React developer working on AI projects"
  Total: 20 tokens
  
Savings: 130 tokens (87%)
```

---

## Performance Features

### Feature: Embedding Cache (Phase 4)

**Status**: Planned  
**Priority**: High

**Problem**:
Generating same embeddings repeatedly is wasteful.

**Solution**:
Cache embeddings for frequently used texts.

**Cache Strategy**:
- In-memory cache: Recent 1000 embeddings
- Disk cache: All computed embeddings
- TTL: 24 hours for in-memory
- Hit rate target: 60%+

**Implementation**:

```
Cache Key: MD5(model + text)
Cache Entry: {
  embedding: number[],
  computed_at: timestamp,
  hit_count: number
}
```

---

### Feature: Streaming Responses (Phase 4)

**Status**: Planned  
**Priority**: Medium

**Problem**:
Large responses have high latency.

**Solution**:
Stream text generation in chunks.

**Benefits**:
- User sees response faster
- Better perceived performance
- Can interrupt generation

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] Embedding generation: < 100ms per text
- [ ] Vector search: < 20ms for 10k memories
- [ ] Integration tests: 100% passing
- [ ] Documentation: Complete and tested
- [ ] Claude can search and retrieve memories

### Phase 2 Success Criteria
- [ ] Automatic memory extraction working
- [ ] 90%+ of key insights captured
- [ ] Memory decay function implemented
- [ ] Tags improve search accuracy by 30%+

### Phase 3 Success Criteria
- [ ] Context injection improves response quality
- [ ] Compression saves 70%+ space
- [ ] Smart ranking improves relevance
- [ ] User feels more continuity in conversations

### Phase 4 Success Criteria
- [ ] Cache hit rate > 60%
- [ ] Response streaming perceived as 2x faster
- [ ] System runs for weeks without issues
- [ ] Performance metrics tracked and dashboarded

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-24  
**Next Update**: After Phase 1 Sprint
