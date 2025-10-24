# Conversation Tracking & Context Architecture

How conversations are tracked and linked to embeddings across the Ollama MCP system.

## The Challenge

The Model Context Protocol is designed as a stateless tool interface. Each tool call from Claude is independent from the protocol's perspective. However, we need to track which conversation generated which memories and embeddings.

**Key Constraint**: Claude Desktop (the MCP client) doesn't inherently track conversation IDs or pass them to MCP servers.

---

## Our Solution: Explicit Conversation Sessions

We solve this through explicit conversation initialization and tracking within the Ollama MCP.

### Architecture

```
Claude Desktop
  │
  ├─ Tool: init_conversation(name?)
  │  └─ Returns: {conversation_id: "conv_abc123", timestamp: "2025-10-24T10:00:00Z"}
  │
  ├─ Tool: store_memory(conversation_id, text, model)
  │  └─ Creates memory linked to conversation_id
  │
  ├─ Tool: search_memories(conversation_id, query_embedding, top_k)
  │  └─ Returns memories only from this conversation
  │
  └─ Tool: end_conversation(conversation_id)
     └─ Marks conversation complete in SQLite
```

---

## Implementation Details

### Phase 1: Minimal Conversation Tracking

In Phase 1, we store the conversation_id in SQLite:

```sql
CREATE TABLE conversations_local (
  conversation_id TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  name TEXT,
  status TEXT DEFAULT 'active'  -- 'active', 'completed'
);
```

**Tools Required**:
- `init_conversation(name?)` - Create new conversation session
- `get_conversation_id()` - Retrieve current conversation ID (if any)
- `end_conversation(conversation_id)` - Close conversation

### Phase 2: PostgreSQL Conversation Linking

When PostgreSQL integration begins, we move conversation tracking there:

```sql
CREATE TABLE conversations (
  conversation_id TEXT PRIMARY KEY,
  created_at TIMESTAMP,
  name TEXT,
  metadata JSONB,
  message_count INT,
  memory_count INT
);
```

**Flow**:
1. Claude calls `init_conversation(name)`
2. MCP creates entry in PostgreSQL conversations table
3. Returns conversation_id
4. All subsequent tool calls include conversation_id parameter
5. Memories, embeddings, searches all filtered by conversation_id

---

## Tool Specifications

### init_conversation

**Purpose**: Create a new conversation session  
**Called**: At start of conversation

```typescript
Tool: init_conversation
Input: {
  name?: string  // Optional user-provided name
}
Output: {
  conversation_id: string,
  created_at: string (ISO timestamp),
  status: "created"
}
```

**Implementation Notes**:
- Generate unique ID (UUID v4)
- Record creation time
- Store in SQLite (Phase 1) or PostgreSQL (Phase 2)
- Log event

**Example Claude Flow**:
```
Claude: "Let's start a new conversation."
[Calls: init_conversation(name: "Project Alpha Discussion")]
Response: {conversation_id: "conv_12345", created_at: "2025-10-24T10:00:00Z"}
Claude: "Great! Now when you store memories, they'll be linked to this conversation."
```

---

### store_memory

**Purpose**: Store embedding linked to current conversation  
**Called**: When saving insights, decisions, or important context

```typescript
Tool: store_memory
Input: {
  conversation_id: string,        // From init_conversation
  content: string,                // Text to store
  embedding: number[],            // Pre-computed embedding (optional)
  tags?: string[],                // Semantic tags
  metadata?: object               // Custom metadata
}
Output: {
  memory_id: number,
  conversation_id: string,
  stored_at: string,
  embedding_dimension: number
}
```

**Implementation Notes**:
- If embedding not provided, generate using default model
- Insert into PostgreSQL memories table with conversation_id FK
- Update conversation.memory_count
- Return memory_id for reference

**Example**:
```
Claude: "I'll store the decision about using TypeScript."
[Calls: store_memory(
  conversation_id: "conv_12345",
  content: "Decided to use TypeScript for the MCP server for type safety",
  tags: ["decision", "architecture", "typescript"]
)]
Response: {memory_id: 789, stored_at: "..."}
```

---

### search_memories

**Purpose**: Retrieve relevant memories from specific conversation  
**Called**: When looking for context

```typescript
Tool: search_memories
Input: {
  conversation_id: string,
  query: string,                  // Query text
  top_k?: number,                 // Number of results (default: 5)
  threshold?: number,             // Min similarity (default: 0.5)
  tags?: string[]                 // Filter by tags
}
Output: {
  results: Array<{
    memory_id: number,
    content: string,
    similarity: number,            // 0-1
    created_at: string,
    tags: string[]
  }>,
  search_time_ms: number
}
```

**Implementation Notes**:
- Generate embedding for query
- Search within specific conversation only
- Apply tag filters if provided
- Return sorted by similarity
- Log search for analytics

**Example**:
```
Claude: "What decisions have I made about architecture?"
[Calls: search_memories(
  conversation_id: "conv_12345",
  query: "architecture decisions",
  tags: ["architecture"],
  top_k: 5
)]
Response: {
  results: [
    {memory_id: 789, content: "Decided to use TypeScript...", similarity: 0.92},
    {memory_id: 790, content: "Using PostgreSQL with pgvector...", similarity: 0.85}
  ],
  search_time_ms: 12
}
```

---

### end_conversation

**Purpose**: Mark conversation as complete  
**Called**: At end of conversation (optional)

```typescript
Tool: end_conversation
Input: {
  conversation_id: string,
  summary?: string                // Optional summary to store
}
Output: {
  conversation_id: string,
  status: "completed",
  final_memory_count: number,
  ended_at: string
}
```

**Implementation Notes**:
- Mark conversation as 'completed' in database
- Store optional summary
- Don't delete data (keep for history)
- Still searchable after completion

---

## Multi-Conversation Scenarios

### Scenario 1: Linear Conversation

```
Conversation starts
  init_conversation() → conv_A
  store_memory(conv_A, ...)
  store_memory(conv_A, ...)
  search_memories(conv_A, ...)
Conversation ends
  end_conversation(conv_A)
```

### Scenario 2: Context from Previous Conversation

```
New conversation
  init_conversation() → conv_B
  search_memories(conv_B, ...) → empty
  
  Claude: "Let me check my previous notes"
  search_all_conversations(query) → finds results from conv_A
  
  Claude: "Based on previous work, I suggest..."
```

For this, we'd add: `search_all_conversations` tool (searches across all conversations)

### Scenario 3: Parallel Discussions

```
Claude: "Let's discuss two topics in parallel"

Topic 1:
  init_conversation(name: "Backend Architecture") → conv_X
  store_memory(conv_X, ...)
  
Topic 2:
  init_conversation(name: "Frontend Design") → conv_Y
  store_memory(conv_Y, ...)

Each conversation maintains separate memory context
```

---

## Conversation Lifecycle

```
┌──────────────────────────────────────────────────┐
│ User initiates conversation                      │
└──────────────────────────┬───────────────────────┘
                           │
                 ┌─────────▼─────────┐
                 │ init_conversation │ → conv_id
                 └─────────┬─────────┘
                           │
                   ┌───────▼────────┐
                   │ Active State   │
                   │ - store_memory │
                   │ - search_      │
                   │   memories     │
                   └───────┬────────┘
                           │
                 ┌─────────▼─────────┐
                 │ end_conversation  │ (optional)
                 └─────────┬─────────┘
                           │
                   ┌───────▼────────┐
                   │ Archived       │
                   │ (still search- │
                   │  able)         │
                   └────────────────┘
```

---

## Data Model Integration

### How Conversation IDs Flow Through System

**Local Storage (SQLite, Phase 1)**:
```
conversations_local
├─ conversation_id
├─ created_at
└─ name
```

**Remote Storage (PostgreSQL, Phase 2)**:
```
conversations
├─ conversation_id (PK)
├─ created_at
├─ name
└─ metadata

memories
├─ memory_id (PK)
├─ conversation_id (FK)
├─ embedding
└─ content
```

**Query**: Find all memories from a conversation
```sql
SELECT * FROM memories
WHERE conversation_id = $1
ORDER BY created_at DESC;
```

---

## Future Enhancements

### Cross-Conversation Context

Tool: `get_context_from_all_conversations(query, limit)`
- Search across all conversations
- Useful for finding related context
- Ordered by relevance

### Conversation Summaries

Automatically generate summaries of conversations:
```
After end_conversation():
  - Generate summary of key points
  - Extract decisions made
  - Create tagged memories
  - Store in PostgreSQL
```

### Conversation Relationships

Track relationships between conversations:
```sql
CREATE TABLE conversation_relationships (
  source_conv_id TEXT,
  related_conv_id TEXT,
  relationship_type TEXT,  -- 'follow_up', 'related', 'duplicate'
  score FLOAT              -- Relevance score
);
```

### Conversation Export

Tool: `export_conversation(conversation_id, format)`
- Export as JSON
- Export as Markdown
- Include all memories and context

---

## FAQ

**Q: What if Claude doesn't call init_conversation?**  
A: Default behavior creates an anonymous conversation on first memory store.

**Q: Can I search across multiple conversations?**  
A: Phase 1: No. Phase 2: Yes, via search_all_conversations tool.

**Q: Are completed conversations deleted?**  
A: No, they're archived and remain searchable.

**Q: How long are conversations kept?**  
A: Indefinitely (or configurable retention policy).

---

**Document Version**: 1.0  
**Created**: 2025-10-24  
**Status**: Ready for Phase 1 implementation
