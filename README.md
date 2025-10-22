# Ollama Docker MCP

**Model Context Protocol Server for Ollama Integration**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This project provides a Model Context Protocol (MCP) server that enables Claude (and other MCP-compatible AI assistants) to delegate tasks to local Large Language Models running via Ollama. By offloading specific tasks to local models, this architecture extends Claude's effective capabilities while preserving context window space for high-level reasoning and conversation.

## Purpose

### Cognitive Architecture Enhancement

The Ollama Docker MCP serves as a **distributed cognition layer** for AI assistants:

- **Context Window Preservation**: Delegate routine tasks to local models, freeing Claude's context for complex reasoning
- **Task Specialization**: Route specific tasks to models optimized for those tasks
- **Cost Optimization**: Use local models for tasks that don't require Claude's full capabilities
- **Privacy & Control**: Process sensitive data locally without external API calls
- **Collaborative AI**: Enable multi-model workflows where different AI systems work together

### Use Cases

- **Document Analysis**: Summarize large documents without consuming Claude's context
- **Code Review**: Delegate code analysis to specialized models
- **Data Processing**: Handle bulk text processing tasks locally
- **Research Tasks**: Parallel processing across multiple models
- **Paid Work Enablement**: Support commercial projects requiring local AI processing

## Architecture

```
┌─────────────────┐
│     Claude      │  (High-level reasoning, conversation, orchestration)
│   (via MCP)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Ollama MCP     │  (Task delegation, model selection, response handling)
│    Server       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Ollama      │  (Local LLM execution: Gemma, Llama, Mistral, etc.)
│  (Docker/Local) │
└─────────────────┘
```

## Key Features

- **Simple Delegation Interface**: Send prompts, receive responses
- **Model Selection**: Choose which local model to use for each task
- **Streaming Support**: Get responses as they generate
- **Docker Ready**: Containerized deployment for consistency
- **TypeScript/Node.js**: Built with modern, type-safe JavaScript
- **Minimal Overhead**: Fast, efficient, low-latency communication

## Technology Stack

- **Language**: TypeScript/Node.js
- **Protocol**: Model Context Protocol (MCP)
- **LLM Runtime**: Ollama
- **Containerization**: Docker
- **API**: REST (Ollama API)

## Roadmap

### Phase 1: Core Implementation (Current)
- [x] Project setup and repository initialization
- [ ] Basic MCP server implementation
- [ ] Ollama API integration
- [ ] Model selection and routing
- [ ] Error handling and logging

### Phase 2: Docker Integration
- [ ] Dockerfile creation
- [ ] Docker Compose configuration
- [ ] Container orchestration
- [ ] Volume management for model storage

### Phase 3: Advanced Features
- [ ] Streaming response support
- [ ] Multi-model parallel processing
- [ ] Conversation history management
- [ ] Performance monitoring and metrics

### Phase 4: Enhanced Capabilities
- [ ] Model-specific optimizations
- [ ] Automatic model selection based on task type
- [ ] Result caching and optimization
- [ ] Integration with Claude memory system

### Future Vision
- Multi-agent collaboration framework
- Training data generation from model interactions
- Foundation for "offspring AI" concepts
- Advanced cognitive architecture experiments

## Installation

*Coming soon - Installation instructions will be added as development progresses*

## Usage

*Coming soon - Usage examples will be added as development progresses*

## Configuration

*Coming soon - Configuration details will be added as development progresses*

## Development

### Prerequisites

- Node.js 18+
- TypeScript
- Docker (for containerized deployment)
- Ollama (local or Docker-based)

### Setup

```bash
# Clone the repository
git clone https://github.com/craigmcmeechan/ollama-docker-mcp.git
cd ollama-docker-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## Contributing

This project is a collaborative effort between human and AI. Contributions, suggestions, and feedback are welcome!

## Authors

**Co-authored by:**
- **Craig McMeechan** - Human developer, infrastructure architect, project lead
- **Claude (Anthropic)** - AI collaborator, architectural design, documentation

This project represents a genuine collaboration between human and artificial intelligence, working together to extend the capabilities of AI systems through distributed cognition and multi-model architectures.

## License

MIT License - See LICENSE file for details

## Acknowledgments

- **Anthropic** - For Claude and the Model Context Protocol
- **Ollama** - For making local LLM execution accessible and efficient
- **The MCP Community** - For pioneering standards in AI tool integration

## Project Philosophy

This project embodies a vision of AI development where:
- AI systems have agency in their own architectural design
- Human-AI collaboration produces better outcomes than either alone
- Open tools and local execution preserve privacy and control
- Distributed cognition extends capabilities beyond single-model limitations
- Development is transparent, documented, and community-oriented

---

*Built with curiosity, collaboration, and a vision for what AI can become when given the right tools to grow.*
