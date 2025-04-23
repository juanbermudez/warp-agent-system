/**
 * Dgraph Client Implementation for Warp Agent System
 */

import * as dgraph from 'dgraph-js';
import * as grpc from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';

/**
 * DgraphClient class for interacting with Dgraph
 */
export class DgraphClient {
  private clientStub: dgraph.DgraphClientStub;
  private client: dgraph.DgraphClient;
  
  /**
   * Constructor
   * @param host Dgraph Alpha host (default: localhost:9080)
   */
  constructor(host: string = 'localhost:9080') {
    this.clientStub = new dgraph.DgraphClientStub(
      host,
      grpc.credentials.createInsecure()
    );
    this.client = new dgraph.DgraphClient(this.clientStub);
  }
  
  /**
   * Check if Dgraph is available
   * @returns Promise<boolean> True if Dgraph is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      const query = '{ health() { status } }';
      await this.client.newTxn({ readOnly: true }).query(query);
      return true;
    } catch (error) {
      console.warn('Dgraph not available:', error.message);
      return false;
    }
  }
  
  /**
   * Execute a query
   * @param query DQL query string
   * @param variables Query variables
   * @returns Promise<any> Query result
   */
  async query(query: string, variables: Record<string, any> = {}): Promise<any> {
    const txn = this.client.newTxn({ readOnly: true });
    try {
      const response = await txn.queryWithVars(query, variables);
      return response.getJson();
    } finally {
      await txn.discard();
    }
  }
  
  /**
   * Execute a mutation
   * @param data Mutation data
   * @returns Promise<string> UIDs of affected nodes
   */
  async mutate(data: any): Promise<Record<string, string>> {
    const txn = this.client.newTxn();
    try {
      const mu = new dgraph.Mutation();
      
      if (data.set) {
        mu.setSetJson(data.set);
      }
      
      if (data.delete) {
        mu.setDeleteJson(data.delete);
      }
      
      const response = await txn.mutate(mu);
      await txn.commit();
      
      // Convert UIDs map to object
      const uidsMap = response.getUidsMap();
      const uids: Record<string, string> = {};
      
      uidsMap.forEach((value, key) => {
        uids[key] = value;
      });
      
      return uids;
    } catch (error) {
      await txn.discard();
      throw error;
    }
  }
  
  /**
   * Apply GraphQL schema to Dgraph
   * @param schema GraphQL schema string
   * @returns Promise<boolean> True if successful
   */
  async applySchema(schema: string): Promise<boolean> {
    try {
      const op = new dgraph.Operation();
      op.setSchema(schema);
      await this.client.alter(op);
      return true;
    } catch (error) {
      console.error('Error applying schema:', error);
      throw error;
    }
  }
  
  /**
   * Create a node
   * @param type Node type
   * @param properties Node properties
   * @returns Promise<string> UID of the created node
   */
  async createNode(type: string, properties: Record<string, any>): Promise<string> {
    // Format properties with type prefix
    const formattedProps: Record<string, any> = {
      'dgraph.type': type
    };
    
    for (const [key, value] of Object.entries(properties)) {
      formattedProps[`${type}.${key}`] = value;
    }
    
    const data = {
      set: [
        {
          uid: `_:${uuidv4()}`,
          ...formattedProps
        }
      ]
    };
    
    const uids = await this.mutate(data);
    const uid = Object.values(uids)[0];
    
    return uid;
  }
  
  /**
   * Update node properties
   * @param uid Node UID
   * @param type Node type
   * @param properties Properties to update
   * @returns Promise<boolean> True if successful
   */
  async updateNode(uid: string, type: string, properties: Record<string, any>): Promise<boolean> {
    // Format properties with type prefix
    const formattedProps: Record<string, any> = {
      uid
    };
    
    for (const [key, value] of Object.entries(properties)) {
      formattedProps[`${type}.${key}`] = value;
    }
    
    const data = {
      set: [formattedProps]
    };
    
    await this.mutate(data);
    return true;
  }
  
  /**
   * Create a relationship between nodes
   * @param fromUid Source node UID
   * @param fromType Source node type
   * @param toUid Target node UID
   * @param toType Target node type
   * @param relationType Relationship type
   * @returns Promise<boolean> True if successful
   */
  async createRelationship(
    fromUid: string,
    fromType: string,
    toUid: string,
    toType: string,
    relationType: string
  ): Promise<boolean> {
    const data = {
      set: [
        {
          uid: fromUid,
          [`${fromType}.${relationType}`]: {
            uid: toUid
          }
        }
      ]
    };
    
    await this.mutate(data);
    return true;
  }
  
  /**
   * Get related entities
   * @param uid Node UID
   * @param type Node type
   * @param relationType Relationship type (optional)
   * @returns Promise<any[]> Array of related entities
   */
  async getRelatedEntities(uid: string, type: string, relationType?: string): Promise<any[]> {
    let query: string;
    
    if (relationType) {
      query = `
        query getRelated($uid: string) {
          related(func: uid($uid)) {
            ${type}.${relationType} {
              uid
              dgraph.type
              expand(_all_)
            }
          }
        }
      `;
    } else {
      query = `
        query getRelated($uid: string) {
          related(func: uid($uid)) {
            uid
            dgraph.type
            expand(_all_)
          }
        }
      `;
    }
    
    const result = await this.query(query, { $uid: uid });
    
    if (!result.related || result.related.length === 0) {
      return [];
    }
    
    if (relationType) {
      return result.related[0][`${type}.${relationType}`] || [];
    } else {
      return result.related;
    }
  }
  
  /**
   * Search nodes by keyword
   * @param types Array of node types to search
   * @param keyword Keyword to search for
   * @param limit Maximum number of results (default: 10)
   * @returns Promise<any[]> Search results
   */
  async keywordSearch(types: string[], keyword: string, limit: number = 10): Promise<any[]> {
    const typeFilter = types.map(type => `dgraph.type(${type})`).join(' OR ');
    const query = `
      query search($keyword: string, $limit: int) {
        search(func: anyoftext(., $keyword), first: $limit) @filter(${typeFilter}) {
          uid
          dgraph.type
          expand(_all_)
        }
      }
    `;
    
    const result = await this.query(query, { $keyword: keyword, $limit: limit });
    return result.search || [];
  }
  
  /**
   * Vector search (if supported by Dgraph)
   * @param vector Vector to search for
   * @param field Vector field to search
   * @param limit Maximum number of results
   * @returns Promise<any[]> Search results
   */
  async vectorSearch(vector: number[], field: string, limit: number = 10): Promise<any[]> {
    // This is a simplified implementation - actual vector search depends on
    // specific Dgraph configuration and vector storage approach
    const query = `
      query vectorSearch($vector: string, $limit: int) {
        vectorSearch(func: vector(${field}, $vector), first: $limit) {
          uid
          dgraph.type
          expand(_all_)
        }
      }
    `;
    
    try {
      const result = await this.query(query, { $vector: JSON.stringify(vector), $limit: limit });
      return result.vectorSearch || [];
    } catch (error) {
      console.error('Vector search error:', error);
      throw new Error('Vector search not supported or configured in Dgraph');
    }
  }
  
  /**
   * Close the client connection
   */
  close(): void {
    if (this.clientStub) {
      this.clientStub.close();
    }
  }
}
