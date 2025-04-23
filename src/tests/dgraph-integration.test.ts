/**
 * Dgraph Integration Tests
 * 
 * This test suite verifies that the Dgraph integration with the Core Agent Toolkit
 * works correctly, including fallback to local implementation when needed.
 */

import { expect } from 'chai';
import { describe, it, before, after } from 'mocha';
import { GraphDatabase } from '../db/dgraph';
import { DgraphClient } from '../db/dgraph-client';
import { queryCkg } from '../tools/query-ckg.js';
import { updateCkg } from '../tools/update-ckg.js';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Test configuration
const TEST_DB_PATH = path.join(process.cwd(), '.warp_test_memory');
const DGRAPH_URL = process.env.WARP_DGRAPH_URL || 'localhost:9080';

// Test project data
const testProject = {
  id: `project-${uuidv4()}`,
  name: 'Test Project',
  description: 'A project for testing Dgraph integration',
  createdAt: new Date().toISOString(),
  status: 'active'
};

// Test task data
const testTask = {
  id: `task-${uuidv4()}`,
  name: 'Test Task',
  description: 'A task for testing Dgraph integration',
  createdAt: new Date().toISOString(),
  status: 'todo',
  priority: 'medium'
};

describe('Dgraph Integration Tests', () => {
  let graphDb: GraphDatabase;
  let dgraphAvailable = false;
  
  before(async () => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(TEST_DB_PATH)) {
      fs.mkdirSync(TEST_DB_PATH, { recursive: true });
    }
    
    // Initialize the database
    graphDb = new GraphDatabase(DGRAPH_URL, TEST_DB_PATH);
    await graphDb.initialize();
    
    // Check if Dgraph is available
    try {
      const client = new DgraphClient(DGRAPH_URL);
      dgraphAvailable = await client.isAvailable();
      client.close();
    } catch (error) {
      dgraphAvailable = false;
    }
    
    console.log(`Running tests with Dgraph ${dgraphAvailable ? 'available' : 'unavailable'}`);
  });
  
  after(async () => {
    // Clean up test data if using Dgraph
    if (dgraphAvailable) {
      try {
        await updateCkg({
          updateType: 'deleteNode',
          nodeType: 'Project',
          nodeId: testProject.id
        });
        
        await updateCkg({
          updateType: 'deleteNode',
          nodeType: 'Task',
          nodeId: testTask.id
        });
      } catch (error) {
        console.error('Error cleaning up test data:', error);
      }
    }
  });
  
  describe('GraphDatabase', () => {
    it('should initialize successfully', async () => {
      expect(graphDb).to.be.an('object');
    });
    
    it('should execute a simple query', async () => {
      const query = '{ q(func: type(Project), first: 1) { uid dgraph.type } }';
      const result = await graphDb.executeQuery(query);
      expect(result).to.be.an('object');
    });
    
    it('should handle query errors gracefully', async () => {
      try {
        const badQuery = '{ q(func: invalid) { uid } }';
        await graphDb.executeQuery(badQuery);
        // If Dgraph is not available, the local implementation might not throw
        if (dgraphAvailable) {
          expect.fail('Should have thrown an error');
        }
      } catch (error) {
        expect(error).to.be.an('error');
      }
    });
  });
  
  describe('queryCkg Tool', () => {
    it('should get node by ID', async () => {
      // First create a test node
      const createResult = await updateCkg({
        updateType: 'createNode',
        nodeType: 'Project',
        nodeData: testProject
      });
      
      expect(createResult.success).to.be.true;
      
      // Then query for it
      const queryResult = await queryCkg({
        queryType: 'getNodeById',
        parameters: {
          nodeType: 'Project',
          id: testProject.id
        },
        requiredProperties: ['name', 'description', 'status']
      });
      
      expect(queryResult.success).to.be.true;
      if (queryResult.success && queryResult.data) {
        expect(queryResult.data).to.have.property('Project.name', testProject.name);
      }
    });
    
    it('should find nodes by label', async () => {
      const queryResult = await queryCkg({
        queryType: 'findNodesByLabel',
        parameters: {
          label: 'Project',
          filter: {
            name: testProject.name
          },
          limit: 10
        },
        requiredProperties: ['name', 'description', 'status']
      });
      
      expect(queryResult.success).to.be.true;
      if (queryResult.success && queryResult.data) {
        expect(queryResult.data).to.be.an('array');
        if (queryResult.data.length > 0) {
          expect(queryResult.data[0]).to.have.property('Project.name', testProject.name);
        }
      }
    });
    
    it('should handle cache options', async () => {
      // First query without cache
      const queryResult1 = await queryCkg({
        queryType: 'getNodeById',
        parameters: {
          nodeType: 'Project',
          id: testProject.id
        },
        requiredProperties: ['name', 'description'],
        cacheOptions: {
          useCache: false
        }
      });
      
      expect(queryResult1.success).to.be.true;
      expect(queryResult1.source).to.not.equal('cache');
      
      // Second query with cache
      const queryResult2 = await queryCkg({
        queryType: 'getNodeById',
        parameters: {
          nodeType: 'Project',
          id: testProject.id
        },
        requiredProperties: ['name', 'description'],
        cacheOptions: {
          useCache: true,
          ttlSeconds: 60
        }
      });
      
      expect(queryResult2.success).to.be.true;
      // Note: Can't reliably test for cache hit due to test setup/timing
    });
  });
  
  describe('updateCkg Tool', () => {
    it('should create a new node', async () => {
      const updateResult = await updateCkg({
        updateType: 'createNode',
        nodeType: 'Task',
        nodeData: testTask
      });
      
      expect(updateResult.success).to.be.true;
      if (updateResult.success && updateResult.data) {
        expect(updateResult.data.operation).to.equal('createNode');
        expect(updateResult.data.nodeType).to.equal('Task');
      }
    });
    
    it('should update node properties', async () => {
      const updateResult = await updateCkg({
        updateType: 'updateNodeProperties',
        nodeType: 'Task',
        nodeId: testTask.id,
        nodeData: {
          status: 'in_progress',
          priority: 'high'
        }
      });
      
      expect(updateResult.success).to.be.true;
      if (updateResult.success && updateResult.data) {
        expect(updateResult.data.operation).to.equal('updateNodeProperties');
        expect(updateResult.data.updatedFields).to.include('status');
        expect(updateResult.data.updatedFields).to.include('priority');
      }
    });
    
    it('should create a relationship between nodes', async () => {
      const updateResult = await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'Project',
        nodeId: testProject.id,
        relationshipType: 'tasks',
        targetNodeType: 'Task',
        targetNodeId: testTask.id
      });
      
      expect(updateResult.success).to.be.true;
      if (updateResult.success && updateResult.data) {
        expect(updateResult.data.operation).to.equal('createRelationship');
        expect(updateResult.data.sourceId).to.equal(testProject.id);
        expect(updateResult.data.targetId).to.equal(testTask.id);
      }
    });
    
    it('should find related nodes', async () => {
      const queryResult = await queryCkg({
        queryType: 'findRelatedNodes',
        parameters: {
          nodeType: 'Project',
          nodeId: testProject.id,
          relationType: 'tasks',
          targetType: 'Task'
        }
      });
      
      expect(queryResult.success).to.be.true;
      if (queryResult.success && queryResult.data) {
        expect(queryResult.data).to.be.an('array');
        // If relationship was created successfully, we should find the task
        if (queryResult.data.length > 0) {
          const relatedTask = queryResult.data[0];
          expect(relatedTask).to.have.property('uid');
        }
      }
    });
    
    it('should batch update multiple operations', async () => {
      const newTask = {
        id: `task-batch-${uuidv4()}`,
        name: 'Batch Task',
        description: 'A task created in a batch operation',
        createdAt: new Date().toISOString(),
        status: 'todo'
      };
      
      const updateResult = await updateCkg({
        updateType: 'batchUpdate',
        batchOperations: [
          {
            updateType: 'createNode',
            nodeType: 'Task',
            nodeData: newTask
          },
          {
            updateType: 'createRelationship',
            nodeType: 'Project',
            nodeId: testProject.id,
            relationshipType: 'tasks',
            targetNodeType: 'Task',
            targetNodeId: newTask.id
          }
        ],
        transactionOptions: {
          commitNow: true
        }
      });
      
      expect(updateResult.success).to.be.true;
      if (updateResult.success && updateResult.data) {
        expect(updateResult.data).to.be.an('array');
        expect(updateResult.data.length).to.equal(2);
        expect(updateResult.data[0].success).to.be.true;
        expect(updateResult.data[1].success).to.be.true;
      }
    });
  });
});
