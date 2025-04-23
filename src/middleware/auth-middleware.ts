// src/middleware/auth-middleware.ts
import { AuthService } from '../services/auth-service.js';
import { logger } from '../utils/logger.js';
import { FastifyRequest, FastifyReply } from 'fastify';

const authService = new AuthService();

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Unauthorized request - Missing or invalid authorization header');
    reply.code(401).send({ error: 'Unauthorized - Missing or invalid authorization header' });
    return;
  }
  
  const token = authHeader.split(' ')[1];
  const isValid = await authService.validateToken(token);
  
  if (!isValid) {
    logger.warn('Unauthorized request - Invalid token');
    reply.code(401).send({ error: 'Unauthorized - Invalid token' });
    return;
  }
  
  // Token is valid, continue
  logger.debug('Authenticated request', { token: token.substring(0, 8) + '...' });
}
