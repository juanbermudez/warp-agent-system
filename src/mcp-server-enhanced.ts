// src/mcp-server-enhanced.ts
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from './middleware/auth-middleware.js';
import { AuthService } from './services/auth-service.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { queryCkgTool } from './tools/query_ckg.js';
import { updateCkgTool } from './tools/update_ckg.js';

// Create Fastify instance
const server = Fastify({
  logger: true
});

// Create auth service
const authService = new AuthService();

// Define handlers for auth routes
async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = request.body as { email: string, password: string };
  
  if (!email || !password) {
    logger.warn('Login attempt with missing credentials');
    return reply.code(400).send({ error: 'Email and password are required' });
  }
  
  logger.info('Login attempt', { email });
  const { session, error } = await authService.signIn(email, password);
  
  if (error) {
    logger.warn('Login failed', { email, error: error.message });
    return reply.code(401).send({ error: error.message });
  }
  
  logger.info('Login successful', { email });
  return reply.send({ token: session.access_token, user: session.user });
}

async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = request.body as { email: string, password: string };
  
  if (!email || !password) {
    logger.warn('Registration attempt with missing credentials');
    return reply.code(400).send({ error: 'Email and password are required' });
  }
  
  logger.info('Registration attempt', { email });
  const { user, error } = await authService.signUp(email, password);
  
  if (error) {
    logger.warn('Registration failed', { email, error: error.message });
    return reply.code(400).send({ error: error.message });
  }
  
  logger.info('Registration successful', { email });
  return reply.send({ message: 'User registered successfully', user });
}

async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  logger.info('Logout attempt');
  const { error } = await authService.signOut();
  
  if (error) {
    logger.warn('Logout failed', { error: error.message });
    return reply.code(500).send({ error: error.message });
  }
  
  logger.info('Logout successful');
  return reply.send({ message: 'Logged out successfully' });
}

// Define handlers for CKG operations
async function queryCKGHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.body as Record<string, any>;
    logger.debug('Query CKG request', { query });
    
    const result = await queryCkgTool.handler(query);
    return reply.send(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error handling Query CKG request', { error: errorMessage });
    return reply.code(500).send({ error: errorMessage });
  }
}

async function updateCKGHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const update = request.body as Record<string, any>;
    logger.debug('Update CKG request', { update });
    
    const result = await updateCkgTool.handler(update);
    return reply.send(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error handling Update CKG request', { error: errorMessage });
    return reply.code(500).send({ error: errorMessage });
  }
}

// Register authentication middleware for protected routes
server.register(async (instance) => {
  // Apply auth middleware to protected routes
  instance.addHook('onRequest', authMiddleware);
  
  // Register protected routes here
  instance.post('/api/query-ckg', queryCKGHandler);
  instance.post('/api/update-ckg', updateCKGHandler);
  // Add other protected endpoints here
});

// Public routes (login, register)
server.post('/api/auth/login', loginHandler);
server.post('/api/auth/register', registerHandler);
server.post('/api/auth/logout', logoutHandler);

// Health check endpoint
server.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
  return { status: 'ok' };
});

// Start server
export async function startMCPServer() {
  try {
    await server.listen({ port: config.mcp.port, host: '0.0.0.0' });
    logger.info(`FASTMCP server running on http://localhost:${config.mcp.port}`);
    return server;
  } catch (err) {
    logger.error('Failed to start FASTMCP server', { error: err });
    throw err;
  }
}

export async function stopMCPServer() {
  await server.close();
  logger.info('FASTMCP server stopped');
}
