FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY src/package.json src/tsconfig.json ./

# Install dependencies
RUN npm install

# Copy TypeScript source
COPY src/src ./src

# Build TypeScript
RUN npm run build

# Use non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check to verify Ollama connectivity
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')"

# Start the MCP server
CMD ["npm", "start"]
