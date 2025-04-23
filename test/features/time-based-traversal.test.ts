import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GraphDatabase } from '../../src/db/dgraph';
import { query_ckg } from '../../src/tools/query-ckg-enhanced';
import { update_ckg } from '../../src/tools/update-ckg-enhanced';
import { v4 as uuidv4 } from 'uuid';

// Mock the GraphDatabase to avoid actual database calls during tests
jest.mock('../../src/db/dgraph');

describe('Time-Based Traversal Tests', () => {
  let mockDb;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock database
    mockDb = new GraphDatabase('localhost:9080', './.warp_memory');
    
    // Mock executeQuery to return test data based on the query
    mockDb.executeQuery = jest.fn().mockImplementation((query, variables) => {
      // Mock time-based queries
      if (query.includes('queryTimePoint')) {
        // For time window queries
        if (variables.startTime && variables.endTime) {
          return {
            queryTimePoint: [
              {
                id: 'tp1',
                timestamp: '2025-04-22T10:00:00Z',
                eventType: 'CREATION',
                entityId: 'task1',
                entityType: 'Task'
              },
              {
                id: 'tp2',
                timestamp: '2025-04-22T11:30:00Z',
                eventType: 'STATUS_CHANGE',
                entityId: 'task1',
                entityType: 'Task'
              },
              {
                id: 'tp3',
                timestamp: '2025-04-22T14:15:00Z',
                eventType: 'MODIFICATION',
                entityId: 'task2',
                entityType: 'Task'
              },
              {
                id: 'tp4',
                timestamp: '2025-04-22T16:45:00Z',
                eventType: 'COMPLETION',
                entityId: 'task1',
                entityType: 'Task'
              }
            ]
          };
        }
        
        // For entity history queries
        if (variables.entityId) {
          if (variables.entityId === 'task1') {
            return {
              queryTimePoint: [
                {
                  id: 'tp1',
                  timestamp: '2025-04-22T10:00:00Z',
                  eventType: 'CREATION'
                },
                {
                  id: 'tp2',
                  timestamp: '2025-04-22T11:30:00Z',
                  eventType: 'STATUS_CHANGE'
                },
                {
                  id: 'tp4',
                  timestamp: '2025-04-22T16:45:00Z',
                  eventType: 'COMPLETION'
                }
              ],
              getTask: {
                id: 'task1',
                name: 'Fix login bug',
                status: 'DONE',
                taskLevel: 'TASK',
                createdAt: '2025-04-22T10:00:00Z',
                modifiedAt: '2025-04-22T16:45:00Z'
              }
            };
          } else if (variables.entityId === 'project1') {
            return {
              queryTimePoint: [
                {
                  id: 'tp5',
                  timestamp: '2025-04-20T09:00:00Z',
                  eventType: 'CREATION'
                },
                {
                  id: 'tp6',
                  timestamp: '2025-04-21T14:20:00Z',
                  eventType: 'MODIFICATION'
                },
                {
                  id: 'tp7',
                  timestamp: '2025-04-23T11:10:00Z',
                  eventType: 'MODIFICATION'
                }
              ],
              getProject: {
                id: 'project1',
                name: 'Authentication Service',
                createdAt: '2025-04-20T09:00:00Z',
                modifiedAt: '2025-04-23T11:10:00Z'
              }
            };
          }
        }
        
        return { queryTimePoint: [] };
      }
      
      // Task with timepoints queries
      if (query.includes('getTask') && variables.id === 'task1') {
        return {
          getTask: {
            id: 'task1',
            title: 'Fix login bug',
            status: 'DONE',
            statusChangeTimePoints: [
              {
                timestamp: '2025-04-22T11:30:00Z',
                eventType: 'STATUS_CHANGE'
              },
              {
                timestamp: '2025-04-22T15:20:00Z',
                eventType: 'STATUS_CHANGE'
              }
            ]
          }
        };
      }
      
      // Project with chronological events
      if (query.includes('getProject') && variables.id === 'project1') {
        return {
          getProject: {
            id: 'project1',
            name: 'Authentication Service',
            tasks: [
              {
                id: 'task1',
                title: 'Fix login bug',
                allTimePoints: [
                  {
                    timestamp: '2025-04-22T10:00:00Z',
                    eventType: 'CREATION'
                  },
                  {
                    timestamp: '2025-04-22T11:30:00Z',
                    eventType: 'STATUS_CHANGE'
                  },
                  {
                    timestamp: '2025-04-22T16:45:00Z',
                    eventType: 'COMPLETION'
                  }
                ]
              },
              {
                id: 'task2',
                title: 'Add SSO integration',
                allTimePoints: [
                  {
                    timestamp: '2025-04-22T09:15:00Z',
                    eventType: 'CREATION'
                  },
                  {
                    timestamp: '2025-04-22T14:15:00Z',
                    eventType: 'MODIFICATION'
                  }
                ]
              }
            ]
          }
        };
      }
      
      return {};
    });
    
    // Mock executeMutation for update operations
    mockDb.executeMutation = jest.fn().mockImplementation((mutation, variables) => {
      if (mutation.includes('addTimePoint')) {
        return { 
          addTimePoint: { 
            timePoint: { 
              id: uuidv4() 
            } 
          } 
        };
      }
      
      if (mutation.includes('updateTask') || 
          mutation.includes('updateProject')) {
        return { success: true };
      }
      
      return { success: true };
    });
    
    // Replace the graphDb in query_ckg and update_ckg with our mock
    global.graphDb = mockDb;
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  test('findTimeRelatedEvents should return events within a time window', async () => {
    const result = await query_ckg({
      queryType: 'findTimeRelatedEvents',
      parameters: {
        startTime: '2025-04-22T09:00:00Z',
        endTime: '2025-04-22T17:00:00Z',
        eventTypes: ['CREATION', 'STATUS_CHANGE', 'MODIFICATION', 'COMPLETION']
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data.queryTimePoint).toBeDefined();
    expect(result.data.queryTimePoint.length).toBe(4);
    
    // Verify events are within the time window
    result.data.queryTimePoint.forEach(event => {
      const eventTimestamp = new Date(event.timestamp).getTime();
      const startTimestamp = new Date('2025-04-22T09:00:00Z').getTime();
      const endTimestamp = new Date('2025-04-22T17:00:00Z').getTime();
      
      expect(eventTimestamp).toBeGreaterThanOrEqual(startTimestamp);
      expect(eventTimestamp).toBeLessThanOrEqual(endTimestamp);
    });
    
    // Verify event types
    const eventTypes = result.data.queryTimePoint.map(event => event.eventType);
    expect(eventTypes).toContain('CREATION');
    expect(eventTypes).toContain('STATUS_CHANGE');
    expect(eventTypes).toContain('MODIFICATION');
    expect(eventTypes).toContain('COMPLETION');
  });
  
  test('findTimeRelatedEvents should filter by event types', async () => {
    const result = await query_ckg({
      queryType: 'findTimeRelatedEvents',
      parameters: {
        startTime: '2025-04-22T09:00:00Z',
        endTime: '2025-04-22T17:00:00Z',
        eventTypes: ['CREATION', 'COMPLETION'] // Only these types
      }
    });
    
    // The mock doesn't actually filter, but in a real implementation it would
    // We'll verify that the correct filter parameters were passed
    expect(mockDb.executeQuery).toHaveBeenCalled();
    const mockCall = mockDb.executeQuery.mock.calls[0][0];
    expect(mockCall).toContain('eventType');
    expect(mockCall).toContain('CREATION');
    expect(mockCall).toContain('COMPLETION');
  });
  
  test('getEntityHistory should return chronological history of an entity', async () => {
    const result = await query_ckg({
      queryType: 'getEntityHistory',
      parameters: {
        entityId: 'task1',
        entityType: 'Task'
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data.queryTimePoint).toBeDefined();
    expect(result.data.queryTimePoint.length).toBe(3);
    expect(result.data.getTask).toBeDefined();
    
    // Verify entity details
    expect(result.data.getTask.id).toBe('task1');
    expect(result.data.getTask.name).toBe('Fix login bug');
    expect(result.data.getTask.status).toBe('DONE');
    
    // Verify event timeline
    const timePoints = result.data.queryTimePoint;
    
    // Events should be in chronological order
    expect(timePoints[0].eventType).toBe('CREATION');
    expect(timePoints[1].eventType).toBe('STATUS_CHANGE');
    expect(timePoints[2].eventType).toBe('COMPLETION');
    
    // Check timestamps are in order
    const timestamps = timePoints.map(tp => new Date(tp.timestamp).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i-1]);
    }
  });
  
  test('getEntityHistory should support time window filtering', async () => {
    const result = await query_ckg({
      queryType: 'getEntityHistory',
      parameters: {
        entityId: 'task1',
        entityType: 'Task',
        startTime: '2025-04-22T11:00:00Z', // Should exclude the creation event
        endTime: '2025-04-22T16:00:00Z'    // Should exclude the completion event
      }
    });
    
    // Again, our mock doesn't actually filter, but in a real implementation it would
    // We'll verify that the correct filter parameters were passed
    expect(mockDb.executeQuery).toHaveBeenCalled();
    const mockCall = mockDb.executeQuery.mock.calls[0][0];
    expect(mockCall).toContain('timestamp');
    expect(mockCall).toContain('$startTime');
    expect(mockCall).toContain('$endTime');
  });
  
  test('createTimePoint should create a new time point entity', async () => {
    const result = await update_ckg({
      updateType: 'createTimePoint',
      parameters: {
        entityId: 'task3',
        entityType: 'Task',
        eventType: 'CREATION',
        timestamp: '2025-04-23T09:00:00Z'
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data.timePointId).toBeDefined();
    
    // Verify the mutation was called
    expect(mockDb.executeMutation).toHaveBeenCalledTimes(2); // One for TimePoint creation, one for relationship
  });
  
  test('Creating an entity should automatically create a creation TimePoint', async () => {
    const result = await update_ckg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'New task',
          description: 'Task description',
          taskLevel: 'TASK',
          status: 'TODO',
          priority: 1,
          project: { id: 'project1' }
        }
      }
    });
    
    expect(result.success).toBe(true);
    
    // Verify that two mutations were called (create node + create TimePoint)
    expect(mockDb.executeMutation).toHaveBeenCalledTimes(2);
  });
  
  test('Updating entity properties should create a modification TimePoint', async () => {
    const result = await update_ckg({
      updateType: 'updateNodeProperties',
      parameters: {
        nodeType: 'Task',
        nodeId: 'task1',
        properties: {
          description: 'Updated description'
        }
      }
    });
    
    expect(result.success).toBe(true);
    
    // Verify that two mutations were called (update properties + create TimePoint)
    expect(mockDb.executeMutation).toHaveBeenCalledTimes(2);
  });
  
  test('Status updates should create a status change TimePoint', async () => {
    const result = await update_ckg({
      updateType: 'updateNodeProperties',
      parameters: {
        nodeType: 'Task',
        nodeId: 'task1',
        properties: {
          status: 'IN_PROGRESS' // Status change
        }
      }
    });
    
    expect(result.success).toBe(true);
    
    // Verify mutations were called
    expect(mockDb.executeMutation).toHaveBeenCalledTimes(2);
    
    // Check if the correct event type was used
    const mockCall = mockDb.executeMutation.mock.calls[1][0]; // Second call is for TimePoint
    expect(mockCall).toContain('STATUS_CHANGE');
  });
});
