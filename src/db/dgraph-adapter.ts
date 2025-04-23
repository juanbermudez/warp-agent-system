/**
 * Adapter module to provide compatibility with existing code that expects
 * different exports from the dgraph module.
 */

import { GraphDatabase } from './dgraph.js';
import { config } from '../config.js';
import { join } from 'path';

/**
 * Create a GraphQL client with fallback to local implementation
 */
export async function createGraphQLClientWithFallback() {
  // Create database connection
  const dgraphUrl = config.dgraphUrl || 'http://localhost:8080/graphql';
  const localDbPath = join(process.cwd(), '.warp_memory', 'local_db');
  
  const db = new GraphDatabase(dgraphUrl, localDbPath);
  await db.initialize();
  
  // Return a client interface compatible with what's expected
  return {
    request: async (query: string, variables: any = {}) => {
      return db.executeQuery(query, variables);
    },
    
    mutate: async (mutation: string, variables: any = {}) => {
      return db.executeMutation(mutation, variables);
    }
  };
}
