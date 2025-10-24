import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

const server = new Server({
  name: "ollama-mcp-server",
  version: "1.0.0",
});

// Tool definitions
const tools: Tool[] = [
  {
    name: "list_models",
    description: "List all available models in the local Ollama instance",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_model_info",
    description: "Get detailed information about a specific model",
    inputSchema: {
      type: "object" as const,
      properties: {
        model: {
          type: "string",
          description: "Name of the model to get info for",
        },
      },
      required: ["model"],
    },
  },
  {
    name: "generate_embedding",
    description:
      "Generate embeddings for text using the specified embedding model",
    inputSchema: {
      type: "object" as const,
      properties: {
        model: {
          type: "string",
          description: "Name of the embedding model (e.g., 'nomic-embed-text')",
        },
        text: {
          type: "string",
          description: "Text to generate embeddings for",
        },
      },
      required: ["model", "text"],
    },
  },
  {
    name: "generate_completion",
    description:
      "Generate text completion using the specified model with streaming support",
    inputSchema: {
      type: "object" as const,
      properties: {
        model: {
          type: "string",
          description: "Name of the model to use for generation",
        },
        prompt: {
          type: "string",
          description: "The prompt to generate completion for",
        },
        temperature: {
          type: "number",
          description: "Temperature for generation (0.0 - 2.0)",
        },
        top_k: {
          type: "number",
          description: "Top K tokens to consider",
        },
        top_p: {
          type: "number",
          description: "Top P probability for nucleus sampling",
        },
      },
      required: ["model", "prompt"],
    },
  },
  {
    name: "batch_embeddings",
    description: "Generate embeddings for multiple texts in batch",
    inputSchema: {
      type: "object" as const,
      properties: {
        model: {
          type: "string",
          description: "Name of the embedding model",
        },
        texts: {
          type: "array",
          items: { type: "string" },
          description: "Array of texts to generate embeddings for",
        },
      },
      required: ["model", "texts"],
    },
  },
  {
    name: "pull_model",
    description: "Pull a model from Ollama registry",
    inputSchema: {
      type: "object" as const,
      properties: {
        model: {
          type: "string",
          description: "Model name to pull (e.g., 'llama2', 'nomic-embed-text')",
        },
      },
      required: ["model"],
    },
  },
  {
    name: "delete_model",
    description: "Delete a model from local Ollama instance",
    inputSchema: {
      type: "object" as const,
      properties: {
        model: {
          type: "string",
          description: "Name of the model to delete",
        },
      },
      required: ["model"],
    },
  },
  {
    name: "check_ollama_health",
    description: "Check if Ollama server is running and healthy",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const toolName = request.params.name;
    const args = request.params.arguments as Record<string, unknown>;

    switch (toolName) {
      case "list_models": {
        const response = await axios.get(`${OLLAMA_HOST}/api/tags`);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "get_model_info": {
        const model = args.model as string;
        const response = await axios.post(
          `${OLLAMA_HOST}/api/show`,
          { name: model },
          { timeout: 10000 }
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "generate_embedding": {
        const model = args.model as string;
        const text = args.text as string;
        const response = await axios.post(
          `${OLLAMA_HOST}/api/embed`,
          {
            model,
            input: text,
          },
          { timeout: 30000 }
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  model,
                  embedding: response.data.embeddings[0],
                  dimension: response.data.embeddings[0].length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "generate_completion": {
        const model = args.model as string;
        const prompt = args.prompt as string;
        const temperature = (args.temperature as number) || 0.7;
        const topK = (args.top_k as number) || 40;
        const topP = (args.top_p as number) || 0.9;

        const response = await axios.post(
          `${OLLAMA_HOST}/api/generate`,
          {
            model,
            prompt,
            stream: false,
            options: {
              temperature,
              top_k: topK,
              top_p: topP,
            },
          },
          { timeout: 60000 }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  model,
                  prompt,
                  response: response.data.response,
                  context: response.data.context,
                  total_duration: response.data.total_duration,
                  load_duration: response.data.load_duration,
                  prompt_eval_count: response.data.prompt_eval_count,
                  prompt_eval_duration: response.data.prompt_eval_duration,
                  eval_count: response.data.eval_count,
                  eval_duration: response.data.eval_duration,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "batch_embeddings": {
        const model = args.model as string;
        const texts = args.texts as string[];
        const embeddings = [];

        for (const text of texts) {
          const response = await axios.post(
            `${OLLAMA_HOST}/api/embed`,
            {
              model,
              input: text,
            },
            { timeout: 30000 }
          );
          embeddings.push({
            text,
            embedding: response.data.embeddings[0],
          });
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  model,
                  count: embeddings.length,
                  embeddings,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "pull_model": {
        const model = args.model as string;
        const response = await axios.post(
          `${OLLAMA_HOST}/api/pull`,
          { name: model },
          { timeout: 600000 } // 10 minutes for large models
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully pulled model: ${model}`,
            },
          ],
        };
      }

      case "delete_model": {
        const model = args.model as string;
        await axios.delete(`${OLLAMA_HOST}/api/delete`, {
          data: { name: model },
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully deleted model: ${model}`,
            },
          ],
        };
      }

      case "check_ollama_health": {
        try {
          const response = await axios.get(`${OLLAMA_HOST}/api/tags`, {
            timeout: 5000,
          });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    status: "healthy",
                    host: OLLAMA_HOST,
                    models_count: response.data.models?.length || 0,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    status: "unhealthy",
                    host: OLLAMA_HOST,
                    error: `Cannot connect to Ollama at ${OLLAMA_HOST}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: ${toolName}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text" as const,
          text: `Error executing tool: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ollama MCP Server running on stdio");
}

main().catch(console.error);
