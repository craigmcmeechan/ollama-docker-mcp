# Phase 1: Configuration Management & Model Inventory

**Scope**: Build a self-contained, configurable Ollama MCP with intelligent model tracking  
**Duration**: 1-2 weeks  
**Deliverable**: Production-ready Ollama MCP Docker container with persistent configuration

---

## Overview

Phase 1 transforms the basic Ollama MCP into a stateful system that:
- Manages its own configuration via environment variables and SQLite persistence
- Discovers and tracks available Ollama models
- Allows runtime configuration updates
- Performs health checks with logging
- Routes requests based on model capabilities

---

## Phase 1 Goals

✅ **Goal 1**: Configuration persists across container restarts  
✅ **Goal 2**: Model inventory automatically synced on startup  
✅ **Goal 3**: Runtime tools allow model property updates  
✅ **Goal 4**: Health checks provide clear diagnostics  
✅ **Goal 5**: All tools reference SQLite for model capabilities

---

## Environment Variables (at startup)

Pass these in Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "ollama": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--add-host", "host.docker.internal:host-gateway", "ollama-mcp-server:latest"],
      "env": {
        "OLLAMA_HOST": "http://host.docker.internal:11434",
        "LOG_LEVEL": "info",
        "DEBUG_MODE": "false",
        "CONFIG_DB_PATH": "/app/config.db"
      }
    }
  }
}
```

**Environment Variables**:

| Variable | Default | Description |
|----------|---------|-------------|
| OLLAMA_HOST | http://127.0.0.1:11434 | URL to Ollama API |
| LOG_LEVEL | info | Logging level (debug, info, warn, error) |
| DEBUG_MODE | false | Enable detailed logging |
| CONFIG_DB_PATH | /app/config.db | Path to SQLite config database |
| STARTUP_HEALTH_CHECK | true | Run health check on startup |
| MODEL_RESCAN_INTERVAL | 3600 | Rescan models every N seconds |

---

## SQLite Configuration Database

### Tables Required

#### 1. `models` Table

Stores discovered Ollama models with properties.

```sql
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_name TEXT UNIQUE NOT NULL,
  model_type TEXT NOT NULL,  -- 'embedding', 'reasoning', 'multi-modal', 'unknown'
  
  -- Discovery
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  first_discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Lifecycle
  is_available BOOLEAN DEFAULT 1,
  disabled_at TIMESTAMP,
  disabled_reason TEXT,
  
  -- Properties
  embedding_dimensions INTEGER,
  quantization TEXT,
  parameters TEXT,
  
  -- User assignments
  is_default_embedding BOOLEAN DEFAULT 0,
  is_default_reasoning BOOLEAN DEFAULT 0,
  
  -- Metrics
  avg_generation_time_ms FLOAT,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  
  -- Metadata
  tags TEXT,  -- JSON array
  custom_properties TEXT,  -- JSON object
  notes TEXT,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT DEFAULT 'system'
);
```

#### 2. `model_properties` Table

Assigns properties to models for routing.

```sql
CREATE TABLE IF NOT EXISTS model_properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_name TEXT NOT NULL,
  property_key TEXT NOT NULL,
  property_value TEXT NOT NULL,
  set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  set_by TEXT DEFAULT 'user',
  FOREIGN KEY(model_name) REFERENCES models(model_name) ON DELETE CASCADE,
  UNIQUE(model_name, property_key)
);
```

#### 3. `health_checks` Table

Logs Ollama connectivity.

```sql
CREATE TABLE IF NOT EXISTS health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL,  -- 'startup', 'periodic', 'manual', 'error'
  status TEXT NOT NULL,  -- 'healthy', 'warning', 'error'
  ollama_host TEXT,
  models_available INTEGER,
  error_message TEXT,
  details TEXT  -- JSON
);
```

#### 4. `configuration` Table

Runtime configuration overrides.

```sql
CREATE TABLE IF NOT EXISTS configuration (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL,
  config_type TEXT,  -- 'string', 'integer', 'boolean', 'json'
  set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  set_by TEXT DEFAULT 'startup',
  notes TEXT
);
```

### Initialization on Startup

```typescript
// 1. Connect to Ollama at OLLAMA_HOST
// 2. Fetch available models via /api/tags
// 3. For each model:
//    - Check if exists in SQLite
//    - If not exists: INSERT with discovered_at timestamp
//    - If exists but not in response: UPDATE is_available=false, set disabled_at
// 4. Log results to health_checks table
// 5. Return status to stderr
```

---

## New Tools (Phase 1)

### Tool 1: `list_models_detailed`

**Status**: New (replaces basic list_models)  
**Purpose**: List models with full property information

```typescript
Tool: list_models_detailed
Input: {
  include_disabled?: boolean  // Include unavailable models (default: false)
}
Output: {
  models: Array<{
    model_name: string,
    model_type: string,  // 'embedding', 'reasoning', etc
    discovered_at: string,
    is_available: boolean,
    is_default_embedding: boolean,
    is_default_reasoning: boolean,
    embedding_dimensions?: number,
    quantization?: string,
    usage_count: number,
    last_used_at?: string,
    tags: string[],
    properties: object
  }>,
  total_count: number,
  available_count: number
}
```

**Implementation**:
- Query `models` JOIN `model_properties`
- Order by availability and usage
- Include all metadata

---

### Tool 2: `update_model_config`

**Status**: New  
**Purpose**: Assign properties to models (e.g., mark as embedding model)

```typescript
Tool: update_model_config
Input: {
  model_name: string,
  model_type?: string,  // 'embedding', 'reasoning', 'multi-modal'
  is_default_embedding?: boolean,
  is_default_reasoning?: boolean,
  tags?: string[],  // Add tags like ['fast', 'accurate']
  custom_properties?: object,
  notes?: string
}
Output: {
  success: boolean,
  model_name: string,
  updated_fields: string[],
  updated_at: string
}
```

**Implementation**:
- Validate model exists and is available
- UPDATE models table
- If any contradictions (e.g., both default embedding?), resolve or error
- Log change in database
- Return confirmation

**Example Claude Usage**:
```
Claude: "Mark nomic-embed-text as the default embedding model"
[Calls: update_model_config(
  model_name: "nomic-embed-text",
  model_type: "embedding",
  is_default_embedding: true,
  tags: ["fast", "reliable"]
)]
Response: {success: true, updated_fields: ["model_type", "is_default_embedding", "tags"]}
```

---

### Tool 3: `rescan_available_models`

**Status**: New  
**Purpose**: Manually trigger model discovery (equivalent to startup scan)

```typescript
Tool: rescan_available_models
Input: {
  force_refresh?: boolean  // Even if recently scanned (default: false)
}
Output: {
  scan_timestamp: string,
  models_found: number,
  models_added: number,
  models_removed: number,
  models_now_unavailable: number,
  details: Array<{
    model_name: string,
    action: string,  // 'added', 'removed', 'updated', 'unchanged'
    reason?: string
  }>
}
```

**Implementation**:
- Call /api/tags on Ollama
- Compare with current models table
- Handle additions (INSERT)
- Handle removals (UPDATE is_available=false)
- Return summary

**Example**:
```
Claude: "Check if any new models are available"
[Calls: rescan_available_models()]
Response: {
  scan_timestamp: "2025-10-24T12:00:00Z",
  models_found: 5,
  models_added: 1,  // New model discovered
  models_removed: 0,
  details: [
    {model_name: "mistral", action: "added"}
  ]
}
```

---

### Tool 4: `get_health_status`

**Status**: Enhanced from basic check_ollama_health  
**Purpose**: Comprehensive system health with history

```typescript
Tool: get_health_status
Input: {
  include_history?: boolean,  // Include recent health checks (default: false)
  history_limit?: number  // How many recent checks (default: 5)
}
Output: {
  current_status: 'healthy' | 'warning' | 'error',
  timestamp: string,
  ollama_host: string,
  
  connectivity: {
    is_reachable: boolean,
    response_time_ms: number,
    last_check_time: string
  },
  
  models: {
    available_count: number,
    unavailable_count: number,
    total_count: number,
    last_rescan: string
  },
  
  configuration: {
    config_db_loaded: boolean,
    tables_initialized: boolean
  },
  
  errors?: [
    {
      error: string,
      timestamp: string
    }
  ],
  
  history?: Array<{
    timestamp: string,
    status: string,
    models_available: number,
    error?: string
  }>
}
```

---

### Tool 5: `get_model_info_extended`

**Status**: Enhanced  
**Purpose**: Get detailed model info including properties and metrics

```typescript
Tool: get_model_info_extended
Input: {
  model_name: string
}
Output: {
  model_name: string,
  model_type: string,
  discovered_at: string,
  is_available: boolean,
  
  capabilities: {
    is_embedding_model: boolean,
    is_reasoning_model: boolean,
    is_multimodal: boolean,
    embedding_dimensions?: number
  },
  
  properties: object,  // Custom properties
  tags: string[],
  
  metrics: {
    usage_count: number,
    last_used_at?: string,
    avg_generation_time_ms?: number
  },
  
  ollama_info: {
    quantization?: string,
    parameters?: string,
    ...other Ollama metadata
  },
  
  notes: string
}
```

---

## Startup Sequence

```
1. Container starts
   │
2. Initialize SQLite database
   ├─ Create tables if not exist
   └─ Load configuration from CONFIG_DB_PATH
   │
3. Connect to Ollama
   ├─ Verify connectivity to OLLAMA_HOST
   ├─ Log attempt to health_checks table
   └─ If fail: log error, return unhealthy status
   │
4. Fetch available models
   ├─ Call /api/tags
   ├─ For each model:
   │  ├─ Check if in SQLite
   │  ├─ If new: INSERT with discovered_at
   │  └─ If missing from list: UPDATE disabled
   └─ Log summary to health_checks
   │
5. MCP Server Ready
   ├─ Listen for tool calls
   ├─ All tools can reference model capabilities in SQLite
   └─ Return ready status
```

---

## Implementation Checklist

### Code Changes
- [ ] Add SQLite integration (npm: sqlite3 or better-sqlite3)
- [ ] Create database initialization function
- [ ] Add tables creation SQL
- [ ] Implement startup health check + logging
- [ ] Implement model discovery logic
- [ ] Create `list_models_detailed` tool
- [ ] Create `update_model_config` tool
- [ ] Create `rescan_available_models` tool
- [ ] Create `get_health_status` tool
- [ ] Create `get_model_info_extended` tool
- [ ] Update existing tools to check SQLite for capabilities
- [ ] Add error handling with detailed logging

### Testing
- [ ] Unit test: SQLite operations
- [ ] Unit test: Model discovery logic
- [ ] Integration test: Startup with Ollama
- [ ] Integration test: Model updates persist
- [ ] Integration test: Health checks work
- [ ] Docker test: Image builds and runs
- [ ] Docker test: Config persists with volume mount

### Documentation
- [ ] Update README with Phase 1 features
- [ ] Document new environment variables
- [ ] Add troubleshooting guide
- [ ] Add example workflows

---

## Acceptance Criteria

✅ Ollama MCP container runs and connects to Ollama  
✅ Models are discovered on startup and stored in SQLite  
✅ Configuration persists across container restarts  
✅ Tools can update model properties at runtime  
✅ Health checks provide clear diagnostic information  
✅ All tools reference SQLite for model capabilities  
✅ Docker image is lean (<200MB)  
✅ Documentation is complete and tested  

---

## Additional Features (Craig's Extended Thinking)

Beyond the original requirements, I suggest these additions to make Phase 1 more robust:

### 1. Model Performance Tracking

Why? As we use models, we should track which ones perform best.

**Implementation**:
- Record generation time for each model use
- Calculate rolling average
- Store in SQLite metrics
- Use for automatic model selection

### 2. Model Compatibility Matrix

Why? Some embedding models work better with certain reasoning models.

**Schema**:
```sql
CREATE TABLE model_compatibility (
  embedding_model TEXT,
  reasoning_model TEXT,
  compatibility_score FLOAT,  -- 0-1
  PRIMARY KEY (embedding_model, reasoning_model)
);
```

### 3. Configuration Validation

Why? Prevent invalid model assignments.

**Logic**:
- Can't mark a reasoning model as embedding
- Can't have multiple default embeddings
- Validate model exists in Ollama before assignment

### 4. Graceful Degradation

Why? If preferred model isn't available, use fallback.

**Implementation**:
- Store fallback model in configuration
- On model unavailable, attempt fallback
- Log the substitution

### 5. Audit Trail

Why? Track who changed what when.

**Enhancement**:
```sql
ALTER TABLE models ADD COLUMN updated_by TEXT;
ALTER TABLE models ADD COLUMN change_reason TEXT;
```

Log every change with who made it and why.

---

## Success Metrics

- **Startup time**: < 2 seconds (after Docker image cached)
- **Model discovery**: < 500ms
- **Tool latency**: < 50ms for queries to SQLite
- **Storage**: SQLite db < 1MB
- **Reliability**: 99.9% uptime in testing

---

**Document Version**: 1.0  
**Created**: 2025-10-24  
**Phase Duration**: 1-2 weeks  
**Next Phase**: PostgreSQL Integration (Phase 2)
