# Development Strategy & Phasing Architecture

**Document Version**: 2.0 (Complete Restructure)  
**Status**: Ready for Implementation  
**Total Duration**: 16-18 weeks  
**Last Updated**: 2025-10-24

---

## Executive Summary

This document defines a **layer-based development architecture** for the Ollama Docker MCP system. Rather than sequential phases, we use logical layers with cross-cutting concerns applied throughout, enabling parallel development streams and better risk management.

**Key Principles**:
- **Build Once, Right**: Foundation (Phase 0) prevents technical debt
- **Parallel Streams**: Phase 2 and 3 work simultaneously
- **Cross-Cutting**: Security, testing, monitoring applied from start
- **Migration-First**: Database schema versioned from day 1
- **Documentation-Driven**: Docs are first-class deliverables

---

## Layer-Based Architecture

### Overview

```
LAYER 1: FOUNDATION (Phase 0)
├─ Docker infrastructure
├─ Git strategy & workflows
├─ Testing framework
├─ Security patterns
├─ Documentation standards
├─ Monitoring hooks
└─ Performance baseline

LAYER 2: LOCAL CONFIGURATION (Phase 1)
├─ SQLite persistence
├─ Model inventory management
├─ Health checking & diagnostics
└─ Monitoring implementation

LAYER 3: DATA PERSISTENCE (Phase 2a-2d, 7-9 weeks)
├─ PostgreSQL setup & connections
├─ Embeddings storage with pgvector
├─ Conversation tracking
├─ Semantic search foundation
└─ Query optimization

LAYER 4: TOOL ORCHESTRATION (Phase 3a-3d, 6-8 weeks, parallel with Layer 3)
├─ Generic CLI tool framework (xterm + node-pty)
├─ Claude Code integration
├─ Tool registry & health checks
└─ Comparative analysis infrastructure

LAYER 5: LOCAL INTELLIGENCE (Phase 4a-4b, 3-4 weeks)
├─ Ollama guidance layer
├─ Pre-filtering decisions
├─ Quality validation
└─ Learning metrics

LAYER 6: KNOWLEDGE INDEXING (Phase 5a-5d, 4 weeks)
├─ Web content fetching
├─ Smart content chunking
├─ Source metadata & versioning
└─ Change detection & re-indexing

LAYER 7: PRODUCTION READINESS (Phase 6a-6d, 4+ weeks)
├─ Comprehensive monitoring
├─ Performance optimization & caching
├─ Cost tracking & budgeting
└─ Scaling & deployment
```

---

## Detailed Phase Structure

### PHASE 0: FOUNDATION (Weeks 1-2)

**Goal**: Establish infrastructure and standards that all subsequent phases depend on.

**Phase 0a: Docker & Build System**
- Dockerfile with multi-stage build
- Docker Compose for dev environment
- Build optimization (layer caching)
- Development vs production configurations
- Image size targets (< 200MB production)

**Deliverables**:
- [ ] Production-ready Dockerfile
- [ ] docker-compose.dev.yml
- [ ] docker-compose.test.yml
- [ ] docker-compose.prod.yml
- [ ] Build documentation
- [ ] Performance targets document

**Phase 0b: Git Strategy & Workflows**
- Repository structure defined
- Branching strategy (main/develop/feature)
- PR template and process
- Code review checklist
- Merge strategy (squash vs merge)
- Release management process

**Deliverables**:
- [ ] Git workflow documentation
- [ ] PR template
- [ ] Code review guidelines
- [ ] Branch protection rules configured
- [ ] Release checklist

**Phase 0c: Testing Infrastructure**
- Jest/Vitest configuration
- Test database setup (SQLite in-memory)
- Mock services (Ollama, Anthropic API)
- Test helpers and fixtures
- CI/CD pipeline (GitHub Actions)
- Coverage targets (80% minimum)

**Deliverables**:
- [ ] Test framework configured
- [ ] CI/CD pipeline working
- [ ] Mock services documented
- [ ] Test helper library
- [ ] GitHub Actions workflows

**Phase 0d: Security Framework**
- Credential management pattern
- Input validation utilities
- Error handling standards
- Audit logging hooks
- Encryption strategy
- Dependency vulnerability scanning

**Deliverables**:
- [ ] Credential storage design
- [ ] Validation utilities
- [ ] Error taxonomy
- [ ] Security documentation
- [ ] Dependency audit setup

**Phase 0e: Documentation Standards**
- README template
- Architecture documentation template
- API documentation structure (OpenAPI)
- Database schema documentation template
- Troubleshooting template
- Auto-generation setup

**Deliverables**:
- [ ] Documentation templates
- [ ] OpenAPI/Swagger setup
- [ ] Auto-generation scripts
- [ ] Documentation review process
- [ ] Example documentation

**Phase 0f: Performance Baseline**
- Startup time measurement (target: < 2 sec)
- Memory usage baseline
- CPU usage baseline
- Query latency baseline (for comparison)
- Benchmarking framework setup

**Deliverables**:
- [ ] Benchmarking suite
- [ ] Baseline metrics documented
- [ ] Performance tracking dashboard template
- [ ] Regression testing setup

**Success Criteria Phase 0**:
- ✅ Docker builds successfully
- ✅ CI/CD pipeline passes all checks
- ✅ Test coverage > 80% on test infrastructure
- ✅ Security patterns documented and enforced
- ✅ Performance baselines established
- ✅ Documentation standards followed
- ✅ All Phase 0 dependencies ready for downstream phases

---

### PHASE 1: LOCAL CONFIGURATION (Weeks 3-5)

**Goal**: Create self-configuring MCP with SQLite persistence for operational state.

**Dependencies**: Phase 0 complete

**Phase 1a: SQLite Persistence Layer**
- Initialize SQLite database
- Schema migration infrastructure (see Phase 1 migrations)
- Connection pooling
- Error handling and recovery
- Encryption for sensitive data

**Phase 1b: Model Inventory Management**
- Model discovery on startup
- Model registry with properties
- Capability assignment (embedding, reasoning, multi-modal)
- Model lifecycle tracking (added, updated, disabled)
- Deduplication logic

**Phase 1c: Health Checking & Diagnostics**
- Startup health checks
- Periodic Ollama connectivity verification
- Model availability tracking
- Health check logging
- Diagnostic endpoints for troubleshooting

**Phase 1d: Monitoring Implementation**
- Structured logging integration
- Metrics collection hooks
- Health check dashboards
- Performance metric tracking
- Error rate monitoring

**Database Schema** (SQLite):
```
- models
- model_properties
- health_checks
- configuration
- schema_versions (for migrations)
```

**New MCP Tools**:
- `list_models_detailed`
- `update_model_config`
- `rescan_available_models`
- `get_health_status`
- `get_model_info_extended`

**Deliverables**:
- [ ] SQLite database with 5 tables
- [ ] Model inventory fully functional
- [ ] Health checks reporting correctly
- [ ] 100+ test cases (unit + integration)
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Migration files created and tested

**Success Criteria Phase 1**:
- ✅ MCP starts, connects to Ollama, discovers models
- ✅ Configuration persists across restarts
- ✅ Health checks provide clear diagnostics
- ✅ All tools working with correct responses
- ✅ No test regressions from Phase 0
- ✅ Performance baselines maintained

---

### PHASE 2: DATA PERSISTENCE (Weeks 6-14)

**Goal**: Implement PostgreSQL-backed knowledge storage with semantic search.

**Dependencies**: Phase 0, Phase 1

**Note**: Phases 2 and 3 work in parallel. Phase 2 focuses on storage layer, Phase 3 focuses on tool orchestration. They converge in later phases.

**Phase 2a: PostgreSQL Setup & Migrations (Weeks 6-7)**
- PostgreSQL connection management
- Connection pooling
- SSL/TLS configuration
- Backup strategy design
- Migration infrastructure for PostgreSQL
- Database initialization scripts

**Database Tables** (Phase 2a):
```
- schema_versions (PostgreSQL)
- pgvector extension setup
```

**Phase 2b: Embeddings Storage & Indexing (Weeks 8-10)**
- Embeddings table with pgvector columns
- Vector similarity indexes (ivfflat/hnsw)
- Token counting infrastructure
- Embedding model tracking
- Batch embedding operations

**Database Tables** (Phase 2b):
```
- memories
- embeddings (internal tracking)
```

**New MCP Tools**:
- `generate_embedding` (enhanced)
- `store_memory`
- `batch_store_memories`

**Phase 2c: Conversation Tracking & Linking (Weeks 11-12)**
- Conversation session management
- Conversation-to-memory linking
- Conversation metadata storage
- Conversation lifecycle management

**Database Tables** (Phase 2c):
```
- conversations
- conversation_metadata (JSONB fields)
```

**New MCP Tools**:
- `init_conversation`
- `end_conversation`
- `get_conversation_summary`

**Phase 2d: Semantic Search Foundation (Weeks 13-14)**
- Vector similarity search implementation
- Query embedding generation
- Result ranking and filtering
- Conversation-scoped search
- Global search across conversations

**New MCP Tools**:
- `search_memories`
- `search_all_conversations`
- `update_memory_metadata`
- `batch_search_memories`

**Database Schema** (PostgreSQL):
```
- conversations
- memories
- embeddings_metadata
- search_history (optional, for analytics)
- schema_versions
```

**Deliverables**:
- [ ] PostgreSQL running with pgvector
- [ ] All Phase 2 tables created and indexed
- [ ] Connection pooling working
- [ ] 200+ test cases (integration + E2E)
- [ ] Search latency < 50ms
- [ ] Conversation tracking working correctly
- [ ] Migration files for all Phase 2 changes
- [ ] Documentation for all new tools
- [ ] Performance benchmarks established

**Success Criteria Phase 2**:
- ✅ Embeddings stored and retrieved
- ✅ Semantic search working correctly
- ✅ Conversations properly tracked
- ✅ Query latency < 50ms (p99)
- ✅ Can store/search 100k+ memories
- ✅ All tests passing
- ✅ No data loss on restart

---

### PHASE 3: TOOL ORCHESTRATION (Weeks 6-13, parallel with Phase 2)

**Goal**: Create generic CLI tool orchestration framework supporting multiple coding assistants.

**Dependencies**: Phase 0, Phase 1 (uses config)

**Phase 3a: Generic CLI Tool Framework (Weeks 6-7)**
- xterm.js + node-pty integration
- Subprocess management
- Terminal output capture
- Timeout and error handling
- Process pooling for resource management
- CLI tool registry interface

**Database Tables** (Phase 3a):
```
- cli_tools
- tool_capabilities
- tool_executions
```

**New MCP Tools**:
- `register_cli_tool`
- `get_tool_registry`

**Phase 3b: Claude Code Integration (Weeks 8-9)**
- Claude Code path detection
- Version tracking
- Authentication setup
- Workspace isolation
- Output parsing for artifacts
- Error recovery and retry logic

**New MCP Tools**:
- `invoke_cli_tool`
- `validate_cli_tool`

**Phase 3c: Tool Registry & Health Checks (Weeks 10-11)**
- Tool availability tracking
- Health check framework for tools
- Tool version management
- Capability detection and storage
- Tool update notifications

**New MCP Tools**:
- `get_tool_health`
- `list_available_tools`

**Phase 3d: Comparative Analysis Infrastructure (Weeks 12-13)**
- Parallel tool execution
- Result aggregation
- Output comparison utilities
- Comparative metrics tracking
- Learning storage

**Database Tables** (Phase 3d):
```
- comparative_analyses
```

**New MCP Tools**:
- `comparative_analysis` (stub, needs Phase 4 for full functionality)

**Deliverables**:
- [ ] CLI tool framework fully functional
- [ ] Claude Code integration working
- [ ] Tool registry populated with Claude Code
- [ ] 150+ test cases
- [ ] Terminal parsing robust and tested
- [ ] Comparative analysis infrastructure ready
- [ ] Migration files for all Phase 3 DB changes
- [ ] Documentation complete
- [ ] Error handling comprehensive

**Success Criteria Phase 3**:
- ✅ Claude Code executes successfully via MCP
- ✅ Terminal output captured correctly
- ✅ Workspace isolation working
- ✅ Tool health checks accurate
- ✅ No resource leaks (processes, memory)
- ✅ Can run multiple tools serially without errors
- ✅ Framework ready for additional tools (Gemini, etc.)

---

### PHASE 4: LOCAL INTELLIGENCE (Weeks 15-17)

**Goal**: Add Ollama-based guidance layer for intelligent decision-making.

**Dependencies**: Phase 1 (Ollama), Phase 2 (data storage), Phase 3 (tool framework)

**Phase 4a: Ollama Guidance Layer (Weeks 15-16)**
- Guidance prompt templates
- Model selection for guidance (neural-chat, mistral, etc.)
- Confidence scoring
- Escalation thresholds
- Guidance caching (avoid repeat queries)
- Performance optimization (local model speed)

**Database Tables** (Phase 4a):
```
- ollama_guidance_configs
- guidance_history (optional, for learning)
```

**New MCP Tools**:
- `ollama_guidance`
- `get_guidance_config`

**Phase 4b: Decision Logic & Confidence Thresholds (Weeks 16-17)**
- Pre-filtering decision tree
- Quality validation framework
- Comparison scoring
- Tie-breaking logic
- Learning from decisions
- Metrics tracking

**New MCP Tools**:
- `spawn_phase_worker` (with Ollama guidance)
- `get_decision_metrics`

**Deliverables**:
- [ ] Ollama guidance working correctly
- [ ] Confidence thresholds appropriate
- [ ] Decision logic well-tested
- [ ] 100+ test cases
- [ ] Guidance latency < 500ms
- [ ] Escalation logic working
- [ ] Learning metrics tracked
- [ ] Documentation with examples
- [ ] Migration files if needed

**Success Criteria Phase 4**:
- ✅ Ollama provides accurate pre-filtering
- ✅ Confidence scores correlate with actual correctness
- ✅ Escalation to expensive tools happens appropriately
- ✅ System learns from decisions over time
- ✅ Local guidance reduces expensive API calls by 30%+

---

### PHASE 5: KNOWLEDGE INDEXING (Weeks 18-21)

**Goal**: Build web content fetching and semantic indexing system.

**Dependencies**: Phase 2 (embeddings storage), Phase 0 (testing)

**Phase 5a: Web Content Fetching (Week 18)**
- HTTP fetching with timeouts
- HTML parsing and text extraction
- Metadata extraction (title, author, date)
- Error handling and retry logic
- Rate limiting for web fetches

**New MCP Tools**:
- `fetch_web_content`

**Phase 5b: Smart Content Chunking (Week 19)**
- Paragraph-aware chunking
- Token counting integration
- Overlap management
- Chunk size optimization
- Semantic boundary detection

**New MCP Tools**:
- `chunk_content`

**Phase 5c: Source Metadata & Versioning (Week 20)**
- Source tracking (URL, file path, etc.)
- Metadata extraction and storage
- Content hashing for change detection
- Version history management
- Filesystem MCP integration

**Database Tables** (Phase 5c):
```
- knowledge_sources
- source_versions (optional, for history)
```

**New MCP Tools**:
- `index_web_page`
- `index_local_file`
- `get_knowledge_sources`
- `get_source_metadata`

**Phase 5d: Change Detection & Re-indexing (Week 21)**
- Content hash comparison
- Differential indexing
- Update detection
- Automatic re-indexing triggers
- Versioning of indexed content

**New MCP Tools**:
- `update_knowledge_source`
- `rescan_knowledge_base`

**Database Tables** (Phase 5d):
```
- embedding_chunks
- indexing_jobs
```

**Deliverables**:
- [ ] Web fetching working reliably
- [ ] Smart chunking producing good chunks
- [ ] Source metadata complete
- [ ] Change detection accurate
- [ ] 150+ test cases
- [ ] Indexing latency acceptable (< 10 sec per page)
- [ ] Can index 1000+ sources
- [ ] Migration files for knowledge base tables
- [ ] Documentation with examples
- [ ] Troubleshooting guide

**Success Criteria Phase 5**:
- ✅ Can index web pages completely
- ✅ Content chunks preserve semantic meaning
- ✅ Source changes detected accurately
- ✅ Re-indexing works correctly
- ✅ Knowledge base searchable and usable
- ✅ Supports 1000+ indexed sources

---

### PHASE 6: PRODUCTION READINESS (Weeks 22+)

**Goal**: Optimize, monitor, and prepare for production deployment.

**Phase 6a: Comprehensive Monitoring (2 weeks)**
- Structured logging (all layers)
- Metrics collection (Prometheus format)
- Dashboards (Grafana or equivalent)
- Alerting framework (Slack, PagerDuty)
- Audit logging (immutable records)
- Performance dashboards

**Deliverables**:
- [ ] Logging infrastructure complete
- [ ] Metrics exported correctly
- [ ] Dashboards functional
- [ ] Alerting configured
- [ ] Audit logging implemented

**Phase 6b: Performance Optimization & Caching (2 weeks)**
- Embedding cache with LRU eviction
- Query result caching
- Ollama response caching
- Cache invalidation strategy
- Performance regression tests

**Deliverables**:
- [ ] Caching layer working
- [ ] Cache hit rates > 60%
- [ ] Search latency improved
- [ ] Memory usage optimized

**Phase 6c: Cost Tracking & Budgeting (1 week)**
- Token counting per operation
- Cost calculation per tool/model
- Budget alerting
- Cost reporting per phase
- Usage analytics

**Deliverables**:
- [ ] Cost tracking accurate
- [ ] Budget alerts working
- [ ] Cost reports available

**Phase 6d: Scaling & Deployment (2+ weeks)**
- Docker image optimization
- Multi-instance support (if needed)
- Load balancing strategy
- Backup and recovery procedures
- Disaster recovery plan
- Production deployment guide

**Deliverables**:
- [ ] Production deployment guide
- [ ] Scaling documentation
- [ ] Backup procedures documented
- [ ] Recovery tested
- [ ] High availability strategy documented

**Success Criteria Phase 6**:
- ✅ 99.9% uptime in testing
- ✅ P99 latency < 100ms
- ✅ Cost tracking accurate
- ✅ Monitoring comprehensive
- ✅ Deployment automated
- ✅ Scaling procedures documented

---

## Cross-Cutting Concerns

These are applied throughout ALL phases:

### SECURITY

**Phase 0 - Framework**:
- [ ] Credential storage design
- [ ] Input validation utilities created
- [ ] Error handling patterns established
- [ ] Audit logging hooks implemented

**Phase 1-2 - Implementation**:
- [ ] SQLite encryption enabled
- [ ] PostgreSQL SSL/TLS configured
- [ ] Environment variable validation
- [ ] API key rotation strategy
- [ ] SQL injection prevention (parameterized queries)

**Phase 6 - Advanced**:
- [ ] Rate limiting implemented
- [ ] DDoS mitigation configured
- [ ] Audit log analysis tools
- [ ] Security scanning in CI/CD

### TESTING STRATEGY

**Phase 0 - Infrastructure**:
- [ ] Jest/Vitest configured
- [ ] Mock services created
- [ ] CI/CD pipeline setup
- [ ] Test database ready

**Phase 1+ - Domain Tests**:
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests (all paths)
- [ ] E2E tests (critical workflows)
- [ ] Performance tests (baseline + regression)

**Phase 6 - Advanced**:
- [ ] Load testing (1000 concurrent)
- [ ] Chaos testing (failure scenarios)
- [ ] Security testing (OWASP)

**Target Coverage**:
- Overall: > 80%
- Critical paths: 100%
- Utilities: 95%+

### DOCUMENTATION STANDARDS

**Phase 0 - Templates**:
- [ ] README template
- [ ] Architecture template
- [ ] API documentation setup (OpenAPI)
- [ ] Database schema documentation
- [ ] Auto-generation scripts

**Phase 1+ - Domain Documentation**:
- [ ] Phase README
- [ ] Architecture decisions
- [ ] API specs (auto-generated)
- [ ] Examples and troubleshooting

**Phase 6 - User Documentation**:
- [ ] User guide
- [ ] Configuration reference
- [ ] Deployment guide
- [ ] Performance tuning guide

**Documentation must include**:
- Why this design?
- How to use?
- What are the trade-offs?
- How to troubleshoot?
- Examples and code samples

### MONITORING & OBSERVABILITY

**Phase 1 - Foundations**:
- [ ] Structured logging (pino/winston)
- [ ] Health check endpoints
- [ ] Error rate tracking

**Phase 2+ - Enhanced**:
- [ ] Database query tracking
- [ ] Performance metrics
- [ ] Cost tracking
- [ ] Resource usage monitoring

**Phase 6 - Production**:
- [ ] Time-series metrics (Prometheus)
- [ ] Dashboards (Grafana)
- [ ] Alerting (Slack/PagerDuty)
- [ ] Log aggregation
- [ ] Trace visualization

### PERFORMANCE STANDARDS

**Baseline Targets** (Phase 0):
- Startup: < 2 seconds
- Health check: < 100ms
- Docker build: < 5 minutes

**Per-Phase Targets**:
- Phase 1: Model discovery < 500ms
- Phase 2: Query latency < 50ms (p99)
- Phase 3: Tool spawn < 1 second
- Phase 4: Guidance query < 500ms
- Phase 5: Indexing < 10 seconds/page
- Phase 6: P99 latency < 100ms

**Resource Targets** (Per Instance):
- Memory baseline: < 500MB
- Memory loaded: < 2GB
- CPU idle: < 5%
- CPU peak: < 80%

---

## Workspace & Git Organization

### Repository Structure

```
ollama-docker-mcp/
│
├─ .github/
│  ├─ ISSUE_TEMPLATE/
│  │  ├─ bug_report.md
│  │  ├─ feature_request.md
│  │  └─ phase_task.md
│  └─ workflows/
│     ├─ ci.yml              # Tests on every PR
│     ├─ performance.yml     # Performance regression checks
│     ├─ security.yml        # Security scanning
│     └─ deploy.yml          # Production deployment
│
├─ src/                       # Shared source code
│  ├─ core/
│  │  ├─ logger.ts
│  │  ├─ database.ts
│  │  ├─ errors.ts
│  │  ├─ types.ts
│  │  └─ constants.ts
│  │
│  ├─ mcp/
│  │  ├─ server.ts           # MCP server entry
│  │  ├─ tools/              # Organized by phase
│  │  │  ├─ phase-1/
│  │  │  │  ├─ list-models.ts
│  │  │  │  ├─ model-config.ts
│  │  │  │  └─ health.ts
│  │  │  ├─ phase-2/
│  │  │  ├─ phase-3/
│  │  │  └─ phase-4/
│  │  └─ handlers.ts
│  │
│  └─ utils/                 # Shared utilities
│     ├─ validation.ts
│     ├─ formatting.ts
│     └─ helpers.ts
│
├─ phases/                    # Phase-specific implementations
│  │
│  ├─ 0-foundation/
│  │  ├─ src/
│  │  │  ├─ docker/
│  │  │  ├─ git/
│  │  │  ├─ testing/
│  │  │  ├─ security/
│  │  │  └─ monitoring/
│  │  ├─ tests/
│  │  ├─ scripts/
│  │  ├─ docs/
│  │  │  ├─ README.md
│  │  │  ├─ ARCHITECTURE.md
│  │  │  ├─ SECURITY_FRAMEWORK.md
│  │  │  ├─ TESTING_SETUP.md
│  │  │  └─ MONITORING_SETUP.md
│  │  ├─ migration.json
│  │  └─ package.json
│  │
│  ├─ 1-config-management/
│  │  ├─ src/
│  │  │  ├─ models/
│  │  │  ├─ tools/
│  │  │  └─ health/
│  │  ├─ tests/
│  │  ├─ migrations/
│  │  │  ├─ 001_sqlite_models.up.sql
│  │  │  ├─ 001_sqlite_models.down.sql
│  │  │  └─ 001.metadata.json
│  │  ├─ docs/
│  │  │  ├─ README.md
│  │  │  ├─ ARCHITECTURE.md
│  │  │  ├─ API.md
│  │  │  ├─ DATABASE_CHANGES.md
│  │  │  ├─ TESTING.md
│  │  │  ├─ DEPLOYMENT.md
│  │  │  └─ TROUBLESHOOTING.md
│  │  ├─ package.json
│  │  └─ README.md (phase overview)
│  │
│  ├─ 2-postgresql-integration/
│  │  ├─ src/
│  │  ├─ tests/
│  │  ├─ migrations/
│  │  │  ├─ 101_postgres_init.up.sql
│  │  │  ├─ 101_postgres_init.down.sql
│  │  │  ├─ 102_embeddings.up.sql
│  │  │  ├─ 102_embeddings.down.sql
│  │  │  └─ *.metadata.json
│  │  ├─ docs/
│  │  └─ package.json
│  │
│  ├─ 3-tool-orchestration/
│  │  ├─ 3a-cli-framework/
│  │  ├─ 3b-claude-code/
│  │  ├─ 3c-tool-registry/
│  │  └─ 3d-comparative-analysis/
│  │
│  ├─ 4-local-intelligence/
│  │  ├─ 4a-ollama-guidance/
│  │  └─ 4b-decision-logic/
│  │
│  ├─ 5-knowledge-indexing/
│  │  ├─ 5a-web-fetching/
│  │  ├─ 5b-chunking/
│  │  ├─ 5c-metadata/
│  │  └─ 5d-change-detection/
│  │
│  └─ 6-production-readiness/
│     ├─ 6a-monitoring/
│     ├─ 6b-performance/
│     ├─ 6c-cost-tracking/
│     └─ 6d-deployment/
│
├─ migrations/                # All migrations in one place
│  ├─ index.ts               # Migration runner
│  ├─ schema_versions.sql    # Migration tracking table (FIRST)
│  │
│  └─ 001-phase-0/
│     ├─ 001_init_sqlite.up.sql
│     ├─ 001_init_sqlite.down.sql
│     └─ 001.metadata.json
│
├─ tests/                     # Shared test infrastructure
│  ├─ setup.ts               # Test environment setup
│  ├─ fixtures/              # Test data
│  │  ├─ models.fixtures.ts
│  │  ├─ embeddings.fixtures.ts
│  │  └─ tools.fixtures.ts
│  ├─ helpers/               # Test utilities
│  │  ├─ database.helpers.ts
│  │  ├─ mock-services.ts
│  │  └─ assertions.ts
│  └─ integration/           # Shared integration tests
│     └─ health.test.ts
│
├─ docker/
│  ├─ Dockerfile
│  ├─ Dockerfile.dev
│  ├─ docker-compose.dev.yml
│  ├─ docker-compose.test.yml
│  └─ docker-compose.prod.yml
│
├─ docs/                      # Shared documentation
│  ├─ DEVELOPMENT_STRATEGY.md (this file)
│  ├─ PROJECT_ROADMAP.md
│  ├─ ARCHITECTURE.md
│  ├─ SECURITY.md
│  ├─ TESTING.md
│  ├─ DATABASE_SCHEMA.md
│  ├─ DEPLOYMENT.md
│  ├─ TROUBLESHOOTING.md
│  ├─ API_REFERENCE.md (auto-generated)
│  └─ CONTRIBUTING.md
│
├─ scripts/
│  ├─ migrate.ts             # Database migration runner
│  ├─ generate-api-docs.ts   # Generate OpenAPI docs
│  ├─ run-tests.sh           # Test runner
│  ├─ health-check.ts        # Health check utility
│  ├─ setup-dev.sh           # Development setup
│  ├─ build-docker.sh        # Docker build
│  └─ deploy.sh              # Production deployment
│
├─ .github/
│  ├─ dependabot.yml         # Dependency scanning
│  └─ CODEOWNERS             # Code ownership
│
├─ .env.example              # Example environment variables
├─ .env.dev                  # Development config
├─ .env.test                 # Test config
├─ .env.prod                 # Production (secrets vault reference)
│
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ tsconfig.test.json
├─ jest.config.js
├─ .eslintrc.json
├─ .prettierrc.json
├─ .gitignore
├─ .dockerignore
│
└─ README.md
```

### Git Branching Strategy

**Branch Naming Convention**:
```
main                         # Production (tagged releases)
develop                      # Integration (next release)
phase/0-foundation          # Phase branch
phase/1-config-management   # Phase branch
feature/0-docker-setup      # Feature branch
feature/0-git-strategy      # Feature branch
bugfix/issue-123            # Bug fix branch
docs/update-api-docs        # Documentation branch
```

**Workflow**:
```
1. Create feature branch from phase branch:
   git checkout -b feature/X-description

2. Work on feature:
   - Write code
   - Write tests (TDD preferred)
   - Update documentation
   - Run local tests

3. Create PR:
   - Target: phase branch (not main)
   - CI/CD must pass
   - Code review required
   - Tests must pass

4. Phase branch lifecycle:
   - Each phase branch starts from develop
   - All features for phase merge here
   - When phase complete: PR to develop
   - Develop tested, then: PR to main
   - main tagged with version

5. Release process:
   - develop → main (tagged v1.0.0, v1.1.0, etc)
   - Tags are production releases
   - main is always production-ready
```

**Protection Rules**:
- `main`: Requires PR, tests pass, code review
- `develop`: Requires PR, tests pass
- `phase/*`: Requires tests pass
- All: No force push

---

## Database Migration System

### Migration Strategy

**Why Migrations?**
- Version control for schema
- Reproducible deployments
- Rollback capability
- Team collaboration
- Audit trail of changes

**Migration Structure**:
```
migrations/
├─ index.ts                    # Migration runner (orchestrates all)
├─ schema_versions.sql         # Create first (migration tracking)
│
└─ 001-phase-0/
   ├─ 001_init_sqlite.up.sql
   ├─ 001_init_sqlite.down.sql
   └─ 001.metadata.json
```

**Naming Convention**:
- 001-099: Phase 0 (foundation)
- 101-199: Phase 1 (config)
- 201-299: Phase 2 (postgres)
- 301-399: Phase 3 (tools)
- 401-499: Phase 4 (intelligence)
- 501-599: Phase 5 (indexing)
- 601-699: Phase 6 (production)

**Migration File Structure**:

**UP migration** (001_init_sqlite.up.sql):
```sql
-- Initialize SQLite schema
CREATE TABLE models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_name TEXT UNIQUE NOT NULL,
  -- ... columns
);

CREATE TABLE model_properties (
  -- ...
);

-- Record migration in schema_versions
INSERT INTO schema_versions (migration_name, phase, status)
VALUES ('001_init_sqlite', 0, 'applied');
```

**DOWN migration** (001_init_sqlite.down.sql):
```sql
-- Rollback SQLite schema
DROP TABLE IF EXISTS model_properties;
DROP TABLE IF EXISTS models;

-- Record rollback
DELETE FROM schema_versions
WHERE migration_name = '001_init_sqlite';
```

**Metadata** (001.metadata.json):
```json
{
  "migration_name": "001_init_sqlite",
  "phase": 0,
  "description": "Initialize SQLite schema with core tables",
  "tables_created": ["models", "model_properties", "health_checks", "configuration"],
  "tables_modified": [],
  "breaking_changes": false,
  "dependencies": [],
  "estimated_duration_ms": 50,
  "rollback_tested": true,
  "requires_code_release": false,
  "status": "ready"
}
```

### Migration Tracking Table

**Required in both SQLite and PostgreSQL**:

```sql
CREATE TABLE schema_versions (
  id BIGSERIAL PRIMARY KEY,
  migration_name TEXT UNIQUE NOT NULL,     -- '001_init_sqlite'
  phase INT NOT NULL,                       -- 0-6
  migration_group TEXT,                     -- 'foundation', 'config', etc
  
  -- Execution info
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_by TEXT DEFAULT 'system',
  execution_time_ms INT,
  
  -- Status
  status TEXT DEFAULT 'pending',            -- 'pending', 'applied', 'failed', 'reverted'
  error_message TEXT,
  
  -- Rollback info
  revert_executed_at TIMESTAMP,
  revert_executed_by TEXT,
  
  -- Metadata
  description TEXT,
  is_reversible BOOLEAN DEFAULT true,
  breaking_changes BOOLEAN DEFAULT false,
  requires_code_release BOOLEAN DEFAULT false
);
```

### Migration Runner

**Script**: `scripts/migrate.ts`

```typescript
interface MigrationOptions {
  direction: 'up' | 'down',
  phase?: number,                    // Run migrations for specific phase
  to_migration?: string,             // Run up to specific migration
  from_migration?: string,           // Start from specific migration
  dry_run?: boolean,                 // Show what would happen
  force?: boolean                    // Force re-application
}

// Usage:
// npm run migrate:up                  # Apply all pending
// npm run migrate:up -- --phase 1     # Apply Phase 1 only
// npm run migrate:down                # Rollback last
// npm run migrate:status              # Show current state
```

---

## Development Practices

### Code Organization & Style

**File Organization**:
```
phases/X-name/src/
├─ index.ts                   # Exports
├─ types.ts                   # TypeScript interfaces
├─ constants.ts               # Configuration constants
├─ errors.ts                  # Error classes
├─ utils.ts                   # Helper functions
├─ feature-1.ts               # Feature implementation
├─ feature-2.ts
└─ __tests__/
   ├─ feature-1.test.ts
   └─ feature-2.test.ts
```

**Naming Conventions**:
- Files: `kebab-case` (model-inventory.ts)
- Classes: `PascalCase` (ModelInventory)
- Functions: `camelCase` (getModels)
- Constants: `SCREAMING_SNAKE` (MAX_TOKENS)
- Private properties: `_leadingUnderscore`

**Code Style**:
- ESLint enforced (in CI/CD)
- Prettier for formatting
- 120 character line limit
- 2 space indentation

### Error Handling

**Error Taxonomy**:
```typescript
// Consistent error types across codebase
class ConfigurationError extends Error {}       // Bad config
class DatabaseError extends Error {}            // DB failures
class ExternalServiceError extends Error {}     // Ollama, API
class ValidationError extends Error {}          // Bad input
class NotFoundError extends Error {}            // Missing resource
class ConflictError extends Error {}            // State mismatch
class NotImplementedError extends Error {}      // TODO features
class PermissionError extends Error {}          // Access denied
class RateLimitError extends Error {}           // Rate limiting
class TimeoutError extends Error {}             // Operation timeout
```

**Error Logging Pattern**:
```typescript
logger.error({
  message: 'Failed to generate embedding',
  error: err.message,
  code: err.code,
  context: { model, text_length },
  severity: 'high',
  stack: err.stack,
  requestId: req.id  // For tracing
});
```

### Logging Standards

**Structured Logging** (using pino or winston):
```typescript
// Good: Structured, machine-readable
logger.info({
  event: 'model_discovered',
  model_name: 'llama2',
  phase: 1,
  timestamp: new Date().toISOString(),
  tags: ['startup', 'discovery']
});

// Bad: Unstructured string
logger.info(`Model llama2 discovered in phase 1`);
```

**Log Levels**:
- `error`: Failures that need attention
- `warn`: Unexpected but handled gracefully
- `info`: Important events and state changes
- `debug`: Detailed information for debugging
- Never use `trace` level

**Always Include**:
- Event name
- Timestamp
- Context (relevant IDs, data)
- Severity level (for errors)
- Request ID (for tracing)

### Testing Standards

**Test Structure**:
```typescript
describe('ModelInventory', () => {
  let inventory: ModelInventory;

  beforeEach(() => {
    inventory = new ModelInventory(mockDb);
  });

  describe('discover()', () => {
    it('should discover available models', async () => {
      // Arrange
      const mockModels = [{name: 'llama2'}];
      mockOllama.getTags.mockResolvedValue(mockModels);

      // Act
      const result = await inventory.discover();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('llama2');
    });

    it('should handle discovery errors gracefully', async () => {
      // Arrange
      mockOllama.getTags.mockRejectedValue(new Error('Connection failed'));

      // Act & Assert
      await expect(inventory.discover()).rejects.toThrow();
    });
  });
});
```

**Coverage Targets**:
- Overall: 80%+
- Critical paths: 100%
- Business logic: 90%+
- Utilities: 95%+

**Test Types**:
1. **Unit Tests**: Individual functions
2. **Integration Tests**: Component interactions
3. **E2E Tests**: Full workflows
4. **Performance Tests**: Latency and memory
5. **Regression Tests**: Prevent old bugs

### Version Management

**Semantic Versioning**: MAJOR.MINOR.PATCH
- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality (backward compatible)
- **PATCH**: Bug fixes

**Version Format**:
- Release: `v1.0.0`
- Pre-release: `v1.0.0-beta.1`
- Development: `1.0.0-dev.123+hash`

**Where to Update**:
- `package.json`: version field
- `src/core/constants.ts`: VERSION constant
- Git tags: `git tag v1.0.0`
- Release notes: Changelog

### Changelog Maintenance

**File**: `CHANGELOG.md`

```markdown
# Changelog

## [1.0.0] - 2025-10-31

### Added
- Phase 1 configuration management
- Model inventory system
- Health checking framework

### Changed
- Updated database schema
- Improved error handling

### Fixed
- Connection pool leak
- Migration rollback issue

### Deprecated
- Old configuration format (deprecated v1.1)

### Security
- Added input validation
- Enabled SQLite encryption
```

---

## Documentation Requirements

### Phase-Specific Documentation

Each phase must include (in `phases/X/docs/`):

**README.md** - Phase Overview
```markdown
# Phase X: [Title]

## Overview
What's built in this phase and why.

## What's New
- New tools
- New database tables
- New capabilities

## Dependencies
What must be completed first.

## Success Criteria
How to know it's done.

## Time Estimate
Duration for typical development team.

## Phase Breakdown
Sub-phases and work streams.
```

**ARCHITECTURE.md** - Design Decisions
```markdown
# Architecture - Phase X

## Design Overview
High-level system design with diagrams.

## Key Components
- Component 1: Purpose, responsibilities
- Component 2: Purpose, responsibilities

## Data Model
- Tables created/modified
- Relationships and constraints
- Indexes created

## Integration Points
How this phase connects to others.

## Trade-offs
- Why we chose this approach
- Alternatives considered and rejected
- Performance/complexity trade-offs
```

**API.md** - Tool Specifications (Auto-generated)
```markdown
# API Reference - Phase X

## New Tools

### Tool: list_models_detailed
**Description**: List available models with full properties

**Input**:
```json
{
  "include_disabled": false  // Include unavailable models
}
```

**Output**:
```json
{
  "models": [...],
  "total_count": 5,
  "available_count": 4
}
```

**Examples**: [code examples]
**Error Cases**: [potential errors and handling]
**Performance**: [expected latency]
```

**DATABASE_CHANGES.md** - Schema Documentation
```markdown
# Database Changes - Phase X

## New Tables
- `models`: [description]
  - Columns: id, model_name, model_type
  - Primary Key: id
  - Indexes: name, type

## Modified Tables
- None in this phase

## Migration Files
- 001_sqlite_models.up.sql
- 001_sqlite_models.down.sql

## Rollback Procedure
How to undo if needed.

## Performance Considerations
- Index strategy
- Query optimization tips
- Scaling considerations
```

**TESTING.md** - Quality Assurance
```markdown
# Testing - Phase X

## Unit Tests
- [X] ModelInventory discovery
- [X] Model property assignment
- [X] Health check logic

## Integration Tests
- [X] Full startup sequence
- [X] Model discovery with Ollama
- [X] Configuration persistence

## Performance Tests
- [X] Model discovery < 500ms
- [X] Health check < 100ms
- [X] Memory usage < 500MB

## Running Tests
```bash
npm test -- --testPathPattern="phase-1"
npm run test:coverage
npm run test:performance
```

## Expected Results
- Coverage: 80%+
- All tests passing
- No performance regressions
```

**DEPLOYMENT.md** - Release & Operations
```markdown
# Deployment - Phase X

## Prerequisites
- PostgreSQL v13+
- Node.js v18+
- Docker installed

## Environment Setup
Set these variables:
- OLLAMA_HOST=http://localhost:11434
- DATABASE_URL=postgresql://...

## Database Migration
```bash
npm run migrate:up -- --phase 1
```

## Verification Steps
1. Health check passes
2. Models discovered
3. Configuration persists
4. Smoke tests passing

## Rollback Procedure
```bash
npm run migrate:down -- --phase 1
```
```

**TROUBLESHOOTING.md** - Support
```markdown
# Troubleshooting - Phase X

## Model Discovery Fails
**Symptom**: Models not discovered on startup
**Diagnosis**: Check `ollama_host` env var
**Solution**: Verify Ollama running at configured URL

## Configuration Persists Incorrectly
**Symptom**: Settings lost after restart
**Diagnosis**: Check SQLite permissions
**Solution**: Ensure write permissions on config.db

## Performance Issues
**Symptom**: Startup takes > 2 seconds
**Diagnosis**: Check model count and network latency
**Solution**: Review model discovery optimization
```

---

## Quality Assurance Checklist

### Pre-Commit Checklist
- [ ] Code compiles without errors
- [ ] Linter passes (eslint)
- [ ] Prettier formatting applied
- [ ] Unit tests passing locally
- [ ] No console.log statements (use logger)
- [ ] No hardcoded secrets
- [ ] Comments updated

### PR Review Checklist
- [ ] Tests pass (CI/CD)
- [ ] Code coverage maintained (80%+)
- [ ] No breaking changes (or documented)
- [ ] Documentation updated
- [ ] Performance targets met
- [ ] Security best practices followed
- [ ] Database migration tested (if applicable)
- [ ] Backward compatible (or migration provided)

### Phase Completion Checklist
- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] Database migrations tested
- [ ] Code reviewed and approved
- [ ] Ready for downstream phases
- [ ] Release notes prepared
- [ ] Changelog updated

---

## Timeline Summary

| Phase | Duration | Start | End | Parallel |
|-------|----------|-------|-----|----------|
| **0** | 2 wks | Wk 1 | Wk 2 | - |
| **1** | 2 wks | Wk 3 | Wk 5 | - |
| **2** | 4 wks | Wk 6 | Wk 9 | ✓ 3a |
| **3a** | 2 wks | Wk 6 | Wk 7 | ✓ 2a |
| **3b** | 2 wks | Wk 8 | Wk 9 | ✓ 2b |
| **3c** | 2 wks | Wk 10 | Wk 11 | ✓ 2c |
| **3d** | 2 wks | Wk 12 | Wk 13 | ✓ 2d |
| **4a** | 2 wks | Wk 15 | Wk 16 | - |
| **4b** | 1 wk | Wk 16 | Wk 17 | - |
| **5a** | 1 wk | Wk 18 | Wk 18 | - |
| **5b** | 1 wk | Wk 19 | Wk 19 | - |
| **5c** | 1 wk | Wk 20 | Wk 20 | - |
| **5d** | 1 wk | Wk 21 | Wk 21 | - |
| **6a** | 2 wks | Wk 22 | Wk 23 | - |
| **6b** | 2 wks | Wk 24 | Wk 25 | - |
| **6c** | 1 wk | Wk 26 | Wk 26 | - |
| **6d** | 2+ wks | Wk 27+ | - | - |
| **TOTAL** | **17-18 weeks** | | | |

---

## Success Definition

**Project is successful when**:

1. ✅ **Phase 0**: Foundation rock-solid, all teams can build on it
2. ✅ **Phase 1**: MCP self-configures and maintains state
3. ✅ **Phase 2**: Embeddings store and search reliably
4. ✅ **Phase 3**: Multiple tools orchestrated correctly
5. ✅ **Phase 4**: Local intelligence reduces API costs 30%+
6. ✅ **Phase 5**: Knowledge base indexable and searchable
7. ✅ **Phase 6**: Production deployment automated and reliable
8. ✅ **Quality**: 80%+ test coverage, zero critical bugs
9. ✅ **Performance**: All targets met (latency, memory, cost)
10. ✅ **Documentation**: Complete, clear, and useful
11. ✅ **Security**: No vulnerabilities found in audit
12. ✅ **Maintainability**: Codebase is clean and extensible

---

## Future Extensibility

**Points for Future Enhancement**:

1. **Multi-Tool Support** (Phase 7+)
   - Google Gemini CLI integration
   - GitHub Copilot CLI
   - Custom tool framework

2. **Advanced AI** (Phase 8+)
   - Multi-modal embeddings
   - Reasoning model optimization
   - Fine-tuning pipelines

3. **Enterprise Features** (Phase 9+)
   - Multi-tenant support
   - Role-based access control
   - Compliance & audit
   - High availability & clustering

4. **Integration Ecosystem** (Phase 10+)
   - Integration marketplace
   - Custom MCP tools
   - Third-party service connectors

---

**Document Owner**: Claude (AI)  
**Last Updated**: 2025-10-24  
**Review Frequency**: After each major phase  
**Status**: ✅ Ready for Implementation
