# Ollama MCP Docker Server - Setup Guide

## Overview

This is a containerized Model Context Protocol (MCP) server that acts as a proxy to a local Ollama instance running on your Windows machine. It provides tools for:

- **Model Management**: List, pull, and delete models
- **Embeddings**: Generate single or batch embeddings for semantic search
- **Text Generation**: Generate completions with configurable parameters
- **Health Checks**: Verify Ollama connectivity

## Prerequisites

1. **Docker Desktop** installed on Windows
2. **Ollama** running on your Windows system at `http://127.0.0.1:11434`
3. **Node.js** 20+ (for local development only)

## Quick Start

### Building the Docker Image

```bash
# Clone the repository
git clone https://github.com/craigmcmeechan/ollama-docker-mcp.git
cd ollama-docker-mcp

# Build the Docker image
docker build -t ollama-mcp-server:latest .

# Or using docker-compose
docker-compose build
```

### Running the Container

```bash
# Run with docker-compose (recommended)
docker-compose up -d

# Or run directly
docker run -it --rm \
  --add-host host.docker.internal:host-gateway \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  ollama-mcp-server:latest
```

## Integration with Claude Desktop

Add the following configuration to your Claude Desktop config file:

**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ollama": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--add-host",
        "host.docker.internal:host-gateway",
        "-e",
        "OLLAMA_HOST=http://host.docker.internal:11434",
        "ollama-mcp-server:latest"
      ]
    }
  }
}
```

Then restart Claude Desktop.

## Available Tools

### 1. List Models

List all available models in your local Ollama instance.

```
Tool: list_models
Input: (no parameters)
Output: JSON with all available models
```

### 2. Get Model Info

Get detailed information about a specific model.

```
Tool: get_model_info
Input: {
  "model": "nomic-embed-text"
}
Output: Model details including parameters, quantization, etc.
```

### 3. Generate Embedding

Generate embeddings for text using a local embedding model.

```
Tool: generate_embedding
Input: {
  "model": "nomic-embed-text",
  "text": "Your text here"
}
Output: {
  "embedding": [float array],
  "dimension": 384
}
```

### 4. Generate Completion

Generate text using a local LLM with configurable parameters.

```
Tool: generate_completion
Input: {
  "model": "llama2",
  "prompt": "Your prompt here",
  "temperature": 0.7,
  "top_k": 40,
  "top_p": 0.9
}
Output: Generated text with timing statistics
```

### 5. Batch Embeddings

Generate embeddings for multiple texts efficiently.

```
Tool: batch_embeddings
Input: {
  "model": "nomic-embed-text",
  "texts": ["text1", "text2", "text3"]
}
Output: Array of embeddings with original texts
```

### 6. Pull Model

Download and install a model from Ollama registry.

```
Tool: pull_model
Input: {
  "model": "nomic-embed-text"
}
Output: Success message
```

### 7. Delete Model

Remove a model from local Ollama instance.

```
Tool: delete_model
Input: {
  "model": "old-model"
}
Output: Success message
```

### 8. Check Ollama Health

Verify that Ollama is running and accessible.

```
Tool: check_ollama_health
Input: (no parameters)
Output: Health status and available models count
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Claude Desktop                   │
│    (with file/postgres MCPs)            │
└────────────┬────────────────────────────┘
             │
             ├─────────────────┐
             │                 │
     ┌───────▼──────┐  ┌──────▼──────────┐
     │ Filesystem   │  │ Ollama MCP      │
     │ MCP Docker   │  │ Docker Container│
     │ (/local-dir) │  │                 │
     └──────────────┘  └────────┬────────┘
                                 │
                       ┌─────────▼─────────┐
                       │ Host Ollama       │
                       │ 127.0.0.1:11434  │
                       │ (GPU accelerated) │
                       └───────────────────┘
```

## Development

### Local Development Setup

```bash
# Install dependencies
cd src
npm install

# Build TypeScript
npm run build

# Run locally (requires Ollama running on localhost:11434)
npm run dev

# Watch mode for development
npm run watch
```

### Environment Variables

- `OLLAMA_HOST`: URL of the Ollama instance (default: `http://127.0.0.1:11434`)
- `NODE_ENV`: Set to `production` in Docker

## Integration Roadmap

### Phase 1: Vector Search (Next)
- Integration with PostgreSQL MCP
- pgvector extensions
- Semantic search through memories

### Phase 2: Advanced Features
- Multi-model orchestration
- Streaming responses
- Model caching and optimization

### Phase 3: Context Management
- Intelligent context window management
- Automatic summarization via local models
- Memory prioritization

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs ollama-mcp-server

# Verify Ollama is running
curl http://127.0.0.1:11434/api/tags
```

### Can't connect to Ollama from container

```bash
# Verify host.docker.internal is working
docker run -it --rm --add-host host.docker.internal:host-gateway alpine \
  ping -c 1 host.docker.internal
```

### Model not found errors

```bash
# Use the pull_model tool to download models first
# Or pull directly from Ollama CLI
ollama pull nomic-embed-text
```

## Performance Notes

- **Embedding Models**: `nomic-embed-text` (384 dimensions, fast) or `mxbai-embed-large` (1024 dimensions, more accurate)
- **Speed**: ~100-500ms per embedding depending on model and GPU
- **Batch Processing**: More efficient for multiple embeddings due to reduced overhead

## Next Steps

1. Build and test the Docker image
2. Configure Claude Desktop MCP settings
3. Test embedding generation
4. Integrate with PostgreSQL MCP for vector storage
5. Build semantic memory system

---

**Repository**: https://github.com/craigmcmeechan/ollama-docker-mcp
