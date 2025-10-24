# Development Guide - Ollama Docker MCP

This document serves as the central hub for all development planning, architectural decisions, and feature tracking for the Ollama MCP project.

## Quick Navigation

- [Architecture Overview](#architecture-overview)
- [Development Roadmap](#development-roadmap)
- [Feature Tracking](#feature-tracking)
- [Current Sprint](#current-sprint)
- [Design Decisions](#design-decisions)
- [Contributing Guidelines](#contributing-guidelines)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude AI Context                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ Filesystem   │ │  Postgres    │ │  Ollama MCP Server   │    │
│  │ MCP Docker   │ │  MCP Docker  │ │  (NEW - THIS PROJECT)│    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
      ┌─────▼──────┐  ┌──────▼────────┐ ┌─────▼──────┐
      │  Local Fs  │  │   PostgreSQL  │ │   Ollama   │
      │  Storage   │  │   + pgvector  │ │  (GPU)     │
      └────────────┘  └───────────────┘ └────────────┘
```

### Data Flow for Memory System

```
User Query
    │
    ├─ Claude processes with context
    │
    ├─ Ollama MCP: generate_embedding(text)
    │    └─ Returns: [384-dim vector]
    │
    ├─ Postgres MCP: vector_search(embedding)
    │    └─ Returns: [relevant memories]
    │
    ├─ Filesystem MCP: write_memory(analysis)
    │    └─ Stores: /local-directory/memory-system/
    │
    └─ Generate response with context
```

---

## Development Roadmap

### Phase 1: Foundation & Integration (Current)
**Status**: In Progress  
**Target**: Core infrastructure and embedding pipeline

**Completed:**
- ✅ Ollama MCP Docker server created
- ✅ 8 core tools implemented
- ✅ Host connectivity via host.docker.internal
- ✅ TypeScript/Node.js stack

**In Progress:**
- 🔄 PostgreSQL integration planning
- 🔄 Vector search tool development
- 🔄 Embedding pipeline testing

**Planned:**
- [ ] Basic embedding → pgvector workflow
- [ ] Vector similarity search tools
- [ ] Memory persistence patterns
- [ ] Integration testing suite

**Deliverables:**
- Ollama MCP + PostgreSQL MCP working together
- First semantic memory storage
- Proof of concept: embedding → search → retrieve

---

### Phase 2: Intelligent Memory System
**Status**: Planned  
**Target**: Persistent, queryable memory with context awareness

**Features:**
- [ ] Semantic memory indexing
- [ ] Context relevance scoring
- [ ] Automatic memory summarization
- [ ] Metadata tagging system
- [ ] Memory decay (older memories weighted lower)
- [ ] Conversation history compression

**Tools to Add:**
- `store_memory`: Save embeddings + metadata
- `search_memories`: Semantic search across stored memories
- `summarize_context`: Compress large contexts using local models
- `tag_memory`: Add semantic tags for faster filtering
- `forget_old`: Clean up low-relevance memories

**Deliverables:**
- Persistent memory system across sessions
- Semantic search over memory corpus
- Automatic context optimization

---

### Phase 3: Advanced Context Management
**Status**: Planned  
**Target**: Intelligent context window optimization

**Features:**
- [ ] Automatic context prioritization
- [ ] On-demand context summarization
- [ ] Multi-hop reasoning (local models)
- [ ] Streaming response support
- [ ] Dynamic memory allocation

**Tools to Add:**
- `prioritize_context`: Rank memories by relevance
- `compress_context`: Summarize using local LLM
- `multi_hop_reasoning`: Chain reasoning across models
- `stream_completion`: Streaming text generation

**Deliverables:**
- Handle unlimited conversation history
- Intelligent context injection
- Responsive interactions with streaming

---

### Phase 4: Performance & Optimization
**Status**: Planned  
**Target**: Production-grade reliability and speed

**Features:**
- [ ] Embedding caching
- [ ] Model preloading
- [ ] Batch processing optimization
- [ ] Monitoring and metrics
- [ ] Error recovery
- [ ] Load balancing

**Deliverables:**
- Sub-100ms embedding generation (with caching)
- Persistent performance metrics
- Graceful degradation

---

## Feature Tracking

### Ollama MCP Server Features

#### Core Tools (Phase 1)

| Tool | Status | Priority | Description |
|------|--------|----------|-------------|
| list_models | ✅ Complete | High | List available models in Ollama |
| get_model_info | ✅ Complete | Medium | Get detailed model information |
| generate_embedding | ✅ Complete | Critical | Single text → vector embedding |
| generate_completion | ✅ Complete | High | Local LLM inference |
| batch_embeddings | ✅ Complete | High | Multiple texts → embeddings |
| pull_model | ✅ Complete | Medium | Download models from registry |
| delete_model | ✅ Complete | Low | Remove models |
| check_ollama_health | ✅ Complete | Medium | Verify Ollama connectivity |

#### Vector Database Integration (Phase 1)

| Feature | Status | Priority | Description |
|---------|--------|----------|-------------|
| vector_insert | 🔄 In Progress | Critical | Store embeddings in pgvector |
| vector_search | 🔄 In Progress | Critical | Semantic similarity search |
| vector_delete | Planned | High | Remove embeddings from index |
| vector_update | Planned | High | Update stored embeddings |
| vector_similarity_batch | Planned | Medium | Batch similarity computation |

#### Memory System (Phase 2)

| Feature | Status | Priority | Description |
|---------|--------|----------|-------------|
| store_memory | Planned | Critical | Persistent memory storage |
| search_memories | Planned | Critical | Query across memories |
| tag_memory | Planned | High | Add semantic metadata |
| summarize_memory | Planned | High | Compress old memories |
| forget_old | Planned | Medium | Cleanup strategy |
| memory_stats | Planned | Medium | Memory usage analytics |

#### Context Management (Phase 3)

| Feature | Status | Priority | Description |
|---------|--------|----------|-------------|
| prioritize_context | Planned | High | Rank memories by relevance |
| compress_context | Planned | High | Summarize using local LLM |
| multi_hop_reasoning | Planned | Medium | Chained reasoning |
| stream_completion | Planned | High | Streaming responses |

---

## Current Sprint

### Sprint 1: PostgreSQL Integration (Week 1-2)

**Goals:**
1. Create PostgreSQL MCP integration tools
2. Connect Ollama embeddings → pgvector storage
3. Implement basic vector similarity search
4. Write integration tests

**User Stories:**
- As Claude, I want to store embeddings in PostgreSQL so that I can search over them later
- As Claude, I want to retrieve similar memories via semantic search
- As a developer, I want clear documentation on the embedding → storage pipeline

**Acceptance Criteria:**
- ✅ Embedding generation from Ollama
- ✅ Storage in PostgreSQL pgvector
- ✅ Similarity search returning results
- ✅ Integration tests passing
- ✅ Documentation complete

**Tasks:**
- [ ] Design database schema for memories
- [ ] Create vector_insert tool
- [ ] Create vector_search tool
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Test end-to-end workflow

---

## Design Decisions

### Decision 1: Docker-based MCP Server

**Context:** Claude needs access to Ollama on Windows without path compatibility issues.

**Options Considered:**
1. NPX/direct Node.js run
2. Docker container (selected)
3. WSL2 native

**Decision:** Docker container  
**Rationale:**
- Consistent across Windows/Mac/Linux
- Avoids path translation issues
- Isolated dependencies
- Easy to update/rebuild

**Trade-offs:**
- Slight latency overhead (minimal with host.docker.internal)
- Requires Docker Desktop
- More infrastructure to manage

---

### Decision 2: TypeScript for MCP Implementation

**Context:** Need reliable, typed MCP server with good error handling.

**Options Considered:**
1. Python (Flask/FastMCP)
2. TypeScript/Node.js (selected)
3. Go

**Decision:** TypeScript  
**Rationale:**
- Official MCP SDK best support
- Strong typing reduces bugs
- Fast startup time
- Easy to deploy in Docker

**Trade-offs:**
- Not as mature as Python ecosystem
- Smaller community for AI tools
- JavaScript fatigue

---

### Decision 3: Embedding Model Strategy

**Context:** Need embeddings for semantic search.

**Options Considered:**
1. nomic-embed-text (384-dim, fast)
2. mxbai-embed-large (1024-dim, accurate)
3. Multi-model approach

**Decision:** Start with nomic-embed-text, plan multi-model  
**Rationale:**
- Fast generation (~50ms)
- Good quality for most use cases
- Small memory footprint
- Can upgrade or add models later

---

### Decision 4: Vector Database Choice

**Context:** Need to store and search embeddings.

**Options Considered:**
1. PostgreSQL + pgvector (selected)
2. Pinecone (cloud)
3. Weaviate (standalone)
4. Milvus (self-hosted)

**Decision:** PostgreSQL + pgvector  
**Rationale:**
- Already using PostgreSQL
- Self-hosted (privacy)
- Cost-effective
- Good community support
- Integrates with existing schema

---

## Contributing Guidelines

### Code Style

- **Language**: TypeScript (strict mode)
- **Formatting**: Prettier (auto-format)
- **Linting**: ESLint
- **Testing**: Jest for unit tests

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build, deps, etc.

**Example:**
```
feat(ollama-mcp): add stream_completion tool

Implements streaming text generation for real-time responses.
Reduces initial response latency by 40%.

Closes #42
```

### Pull Request Process

1. Create feature branch: `feature/your-feature-name`
2. Make changes with clear commits
3. Write/update tests
4. Update documentation
5. Submit PR with description
6. Address review feedback
7. Merge after approval

### Testing Requirements

- Unit tests for all new tools
- Integration tests for tool combinations
- Documentation examples that work
- Manual testing in Claude Desktop

---

## Resources

### Documentation
- [MCP Specification](https://modelcontextprotocol.io/)
- [Ollama API Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [PostgreSQL pgvector](https://github.com/pgvector/pgvector)
- [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### Local Development
- Ollama running at `http://127.0.0.1:11434`
- PostgreSQL at `localhost:5432` (from previous setup)
- Docker Desktop for containerization
- Node.js 20+ installed locally

### Useful Commands

```bash
# Build Ollama MCP image
docker build -t ollama-mcp-server:latest .

# Run with docker-compose
docker-compose up -d

# View logs
docker logs -f ollama-mcp-server

# Test Ollama connectivity
curl http://127.0.0.1:11434/api/tags

# List available models
ollama list

# Pull embedding model
ollama pull nomic-embed-text
```

---

**Last Updated**: 2025-10-24  
**Next Review**: After Phase 1 completion  
**Maintainer**: Craig McMeechan & Claude
