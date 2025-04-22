// src/config.ts

// Configuration for the application
export const config = {
  // Dgraph configuration
  dgraph: {
    address: process.env.DGRAPH_ADDRESS || 'localhost:9080',
    graphqlEndpoint: process.env.DGRAPH_GRAPHQL_ENDPOINT || 'http://localhost:8080/graphql',
    authToken: process.env.DGRAPH_AUTH_TOKEN,
  },
  // MCP configuration
  mcp: {
    port: parseInt(process.env.MCP_PORT || '3000', 10),
    host: process.env.MCP_HOST || 'localhost',
  },
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE,
  },
  // Project configuration
  project: {
    root: process.cwd(),
    memoryDir: process.env.MEMORY_DIR || '.warp_memory',
    hitlDir: process.env.HITL_DIR || '.warp_hitl',
  },
};
