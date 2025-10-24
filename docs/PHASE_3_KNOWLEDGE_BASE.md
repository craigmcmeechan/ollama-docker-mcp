# Phase 3: Knowledge Base & Web Integration

**Scope**: Index external sources and build searchable knowledge base  
**Duration**: 3-4 weeks  
**Prerequisites**: Phase 2 complete  
**Deliverable**: Can ingest web pages, files, and build semantic index  

---

## Overview

Phase 3 transforms the system from conversation-only to a true knowledge base:
- Fetch and process web content
- Chunk and embed external sources
- Track source metadata with versioning
- Store original media via Filesystem MCP
- Maintain audit trail of indexing

---

## Phase 3 Goals

✅ **Goal 1**: Fetch web content and prepare for embedding  
✅ **Goal 2**: Intelligently chunk content (text, tables, code)  
✅ **Goal 3**: Store original content + metadata  
✅ **Goal 4**: Track source changes (versioning)  
✅ **Goal 5**: Create queryable knowledge base  

---

## New Tools (Phase 3)

### Tool 1: `index_web_page`

**Status**: New  
**Purpose**: Fetch, process, and index a web page

```typescript
Tool: index_web_page
Input: {
  url: string,
  chunk_size?: number,  // Tokens per chunk (default: 500)
  overlap?: number,  // Chunk overlap (default: 50)
  custom_metadata?: object
}
Output: {
  source_id: string,
  url: string,
  chunks_created: number,
  embeddings_created: number,
  total_tokens: number,
  indexed_at: string,
  metadata: {
    title: string,
    author?: string,
    published_date?: string,
    word_count: number
  }
}
```

**Implementation**:
1. Fetch page via HTTP
2. Extract text content (no HTML)
3. Extract metadata (title, author, date)
4. Split into chunks
5. Generate embeddings for each chunk
6. Store chunks in embedding_chunks table
7. Create source record in knowledge_sources
8. Save original HTML to filesystem via filesystem MCP

---

### Tool 2: `index_local_file`

**Status**: New  
**Purpose**: Index files (PDF, TXT, Markdown, etc)

```typescript
Tool: index_local_file
Input: {
  file_path: string,  // Via filesystem MCP
  file_type?: string,  // 'pdf', 'txt', 'markdown', 'auto'
  chunk_size?: number,
  custom_metadata?: object
}
Output: {
  source_id: string,
  file_path: string,
  file_type: string,
  chunks_created: number,
  indexed_at: string
}
```

**Why**: Support local documents from filesystem MCP.

---

### Tool 3: `update_knowledge_source`

**Status**: New  
**Purpose**: Re-index updated source

```typescript
Tool: update_knowledge_source
Input: {
  source_id: string,
  force?: boolean  // Re-index even if unchanged
}
Output: {
  source_id: string,
  status: string,  // 'unchanged', 'updated', 'reindexed'
  new_chunks: number,
  old_chunks: number,
  changes: {
    added: number,
    modified: number,
    removed: number
  }
}
```

**Implementation**:
1. Fetch current version
2. Compare hash with stored hash
3. If unchanged: return 'unchanged'
4. If changed: diff and update
5. Store version in knowledge_sources

---

### Tool 4: `search_knowledge_base`

**Status**: New  
**Purpose**: Query knowledge base (not conversations)

```typescript
Tool: search_knowledge_base
Input: {
  query: string,
  top_k?: number,
  filters?: {
    source_type?: string,  // 'webpage', 'pdf_file', etc
    source_id?: string,
    after_date?: string
  }
}
Output: {
  results: Array<{
    chunk_id: number,
    source_id: string,
    source_url_or_path: string,
    content: string,
    similarity: number,
    page_number?: number,
    metadata: object
  }>,
  search_time_ms: number
}
```

---

### Tool 5: `get_knowledge_sources`

**Status**: New  
**Purpose**: List indexed sources

```typescript
Tool: get_knowledge_sources
Input: {
  status?: string,  // 'indexed', 'pending', 'failed'
  source_type?: string
}
Output: {
  sources: Array<{
    source_id: string,
    source_type: string,
    url_or_path: string,
    status: string,
    indexed_at: string,
    chunk_count: number,
    last_updated: string,
    metadata: object
  }>,
  total_count: number
}
```

---

### Tool 6: `get_source_metadata`

**Status**: New  
**Purpose**: Get detailed source information

```typescript
Tool: get_source_metadata
Input: {
  source_id: string
}
Output: {
  source_id: string,
  source_type: string,
  url_or_path: string,
  
  status: string,
  indexed_at: string,
  last_checked: string,
  last_updated_source: string,
  
  content_info: {
    total_chunks: number,
    total_embeddings: number,
    total_tokens: number,
    average_chunk_size: number
  },
  
  metadata: {
    title: string,
    author?: string,
    date_published?: string,
    word_count: number,
    language: string
  },
  
  filesystem_path: string,  // Where original stored
  
  version_history: Array<{
    version: number,
    indexed_at: string,
    hash: string,
    chunk_count: number,
    note?: string
  }>
}
```

---

## Content Chunking Strategy

### Smart Chunking

```typescript
// Chunk intelligently based on structure
function smartChunk(content: string, chunkSize: number = 500): string[] {
  // 1. Split by paragraphs first
  const paragraphs = content.split(/\n\n+/);
  
  // 2. For each paragraph, estimate tokens
  const chunks = [];
  let currentChunk = '';
  
  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    const currentTokens = estimateTokens(currentChunk);
    
    if (currentTokens + paraTokens > chunkSize && currentChunk) {
      // Current chunk is full, save it
      chunks.push(currentChunk);
      currentChunk = para;  // Start new chunk with paragraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  
  return chunks;
}
```

**Why Smart Chunking?**
- Preserves semantic meaning (doesn't split paragraphs)
- Respects natural boundaries
- Better search results

---

## Metadata Storage Structure

### Knowledge Source Metadata (JSON)

Stored in `knowledge_sources.metadata` JSONB:

```json
{
  "resource": {
    "id": "source_web_001",
    "type": "webpage",
    "source_url": "https://example.com/article",
    "indexed_at": "2025-10-24T10:00:00Z",
    "last_checked": "2025-10-24T12:00:00Z",
    "content_hash": "sha256_hash",
    "status": "indexed",
    
    "extraction": {
      "title": "Article Title",
      "author": "John Doe",
      "published_date": "2025-10-20T00:00:00Z",
      "last_modified": "2025-10-23T15:00:00Z",
      "word_count": 5000,
      "language": "en",
      "reading_time_minutes": 15
    },
    
    "technical": {
      "http_status": 200,
      "content_type": "text/html",
      "charset": "utf-8",
      "ssl_verified": true,
      "redirect_chain": []
    },
    
    "extraction_quality": {
      "content_confidence": 0.95,
      "has_main_content": true,
      "extraction_method": "html2text",
      "notes": "Successfully extracted article body"
    }
  },
  
  "indexing": {
    "chunks": {
      "count": 12,
      "average_size_tokens": 450,
      "total_tokens": 5400
    },
    "embeddings": {
      "count": 12,
      "model": "nomic-embed-text",
      "dimension": 384
    },
    "processing": {
      "start_time": "2025-10-24T10:00:00Z",
      "end_time": "2025-10-24T10:02:30Z",
      "duration_seconds": 150,
      "errors": 0
    }
  },
  
  "version_control": {
    "version": 2,
    "previous_version_hash": "old_hash",
    "version_changes": {
      "sections_added": ["new_section"],
      "sections_removed": [],
      "sections_modified": ["intro"],
      "chunks_added": 2,
      "chunks_removed": 1
    }
  }
}
```

---

## Filesystem MCP Integration

### Storage Structure

Original content stored via Filesystem MCP:

```
/local-directory/knowledge-base/
├── sources.json           # Index of all sources
├── web/
│   ├── example_com_article_001/
│   │   ├── original.html
│   │   ├── extracted_text.md
│   │   └── metadata.json
│   └── another_site_001/
│       ├── original.html
│       └── metadata.json
├── files/
│   ├── document_001/
│   │   ├── original.pdf
│   │   ├── extracted_text.txt
│   │   └── metadata.json
│   └── spreadsheet_001/
│       ├── original.xlsx
│       ├── extracted.csv
│       └── metadata.json
└── archive/
    └── old_sources/
```

### metadata.json Format

```json
{
  "source_id": "web_example_com_001",
  "source_type": "webpage",
  "source_url": "https://example.com/article",
  "indexed_at": "2025-10-24T10:00:00Z",
  
  "resource_metadata": {
    "title": "Article Title",
    "author": "Author Name",
    "date_published": "2025-10-20T00:00:00Z",
    "date_accessed": "2025-10-24T10:00:00Z",
    "url_accessed": "https://example.com/article",
    "status_code": 200
  },
  
  "files": {
    "original": "original.html",
    "extracted": "extracted_text.md",
    "format": "HTML"
  },
  
  "content": {
    "word_count": 5000,
    "estimated_tokens": 6500,
    "language": "en",
    "reading_time_minutes": 15
  },
  
  "indexing": {
    "chunks_created": 12,
    "embeddings_created": 12,
    "indexed_at": "2025-10-24T10:02:30Z",
    "embedding_model": "nomic-embed-text",
    "status": "indexed"
  },
  
  "version": 1,
  "prev_version_hash": null
}
```

---

## Detection & Handling: Source Changes

### Change Detection

```typescript
async function detectSourceChanges(sourceId: string): Promise<ChangeDetection> {
  // 1. Fetch current version
  const currentContent = await fetchSource(sourceId);
  const currentHash = sha256(currentContent);
  
  // 2. Compare with stored hash
  const storedRecord = await db.query(
    'SELECT content_hash FROM knowledge_sources WHERE source_id = $1',
    [sourceId]
  );
  
  if (currentHash === storedRecord.content_hash) {
    return {
      changed: false,
      reason: 'No changes detected'
    };
  }
  
  // 3. Analyze what changed
  const changes = await diffContent(storedRecord.content, currentContent);
  
  return {
    changed: true,
    content_hash_old: storedRecord.content_hash,
    content_hash_new: currentHash,
    changes: changes
  };
}
```

### Re-indexing Strategy

**Option 1: Full Re-index**
- Simple, complete
- But: slow for large sources

**Option 2: Differential Re-index**
- Only index changed sections
- Faster
- But: complex to implement

**Recommendation**: Start with full re-index, optimize later if needed.

---

## Performance Considerations

### Indexing Speed

```
Content Type | Avg Speed | 1000 tokens
-------------|-----------|--------
Webpage      | ~2-3s/page| 1 embedding + 1 fetch
PDF          | ~5-10s    | Parse + embed
Text file    | ~1-2s     | Direct embed
```

### Optimization

```typescript
// Parallel embedding generation
const chunks = smartChunk(content);
const embeddings = await Promise.all(
  chunks.map(chunk => generateEmbedding(chunk, model))
);

// Batch database inserts
await pool.query('BEGIN');
for (const [chunk, embedding] of zip(chunks, embeddings)) {
  await insertChunk(chunk, embedding);
}
await pool.query('COMMIT');
```

---

## Error Handling

```typescript
if (error.type === 'FETCH_ERROR') {
  logToHealthChecks('web_fetch_failed', url, error);
  markSourceAsFailed(sourceId, 'Web fetch failed');
} else if (error.type === 'PARSE_ERROR') {
  logToHealthChecks('content_parse_failed', sourceId, error);
  // Still store raw content for manual review
} else if (error.type === 'EMBEDDING_ERROR') {
  logToHealthChecks('embedding_failed', sourceId, error);
  // Partial indexing - store what we have
}
```

---

## Acceptance Criteria

✅ Can fetch and index web pages  
✅ Can index local files (PDF, TXT, Markdown)  
✅ Intelligent chunking preserves context  
✅ Original content stored via filesystem MCP  
✅ Metadata captured and stored  
✅ Source changes detected and handled  
✅ Knowledge base searchable  
✅ All tests pass  

---

## Additional Features (Craig's Extended Thinking)

### 1. Web Crawler

Automatically follow links and index related pages:

```typescript
Tool: crawl_website
Input: {
  seed_url: string,
  max_pages?: number,
  allow_external?: boolean
}
```

### 2. Feed Indexing

Subscribe to RSS/Atom feeds:

```typescript
Tool: subscribe_to_feed
Input: {
  feed_url: string
}
```

### 3. OCR for Images

Extract text from images in PDFs/screenshots:

```typescript
Tool: index_with_ocr
Input: {
  file_path: string,
  ocr_enabled: boolean
}
```

---

**Document Version**: 1.0  
**Created**: 2025-10-24  
**Phase Duration**: 3-4 weeks  
**Next Phase**: Performance & Advanced Features (Phase 4)
