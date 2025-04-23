import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GraphDatabase } from '../../src/db/dgraph.js';
import { queryCkg } from '../../src/tools/query-ckg.js';
import { updateCkg } from '../../src/tools/update-ckg.js';
import { v4 as uuidv4 } from 'uuid';

// Mock the GraphDatabase to avoid actual database calls during tests
jest.mock('../../src/db/dgraph');

describe('Scope Resolution Tests', () => {
  let mockDb;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock database
    mockDb = new GraphDatabase('localhost:9080', './.warp_memory');
    
    // Mock executeQuery to return test data based on the query
    mockDb.executeQuery = jest.fn().mockImplementation((query, variables) => {
      // Look for rule queries
      if (query.includes('queryRule')) {
        // Check which scope we're querying
        if (variables.level === 'USER' && variables.id === 'user123') {
          return {
            queryRule: [
              {
                id: 'rule1',
                name: 'CommitMessageFormat',
                description: 'User-specific commit message format',
                ruleType: 'NAMING_CONVENTION',
                content: 'feat(scope): subject',
                scope: 'USER'
              },
              {
                id: 'rule2',
                name: 'SecurityCheck',
                description: 'User-specific security check',
                ruleType: 'SECURITY',
                content: 'Run security scan before commit',
                scope: 'USER'
              }
            ]
          };
        } else if (variables.level === 'PROJECT' && variables.id === 'proj123') {
          return {
            queryRule: [
              {
                id: 'rule3',
                name: 'CodingStyle',
                description: 'Project-specific coding style',
                ruleType: 'CODE_STANDARD',
                content: '4 space indentation, no semicolons',
                scope: 'PROJECT'
              }
            ]
          };
        } else if (variables.level === 'TEAM' && variables.id === 'team123') {
          return {
            queryRule: [
              {
                id: 'rule4',
                name: 'TestCoverage',
                description: 'Team-specific test coverage',
                ruleType: 'TESTING',
                content: 'Minimum 80% test coverage',
                scope: 'TEAM'
              }
            ]
          };
        } else if (variables.level === 'DEFAULT') {
          return {
            queryRule: [
              {
                id: 'rule5',
                name: 'CommitMessageFormat',
                description: 'Default commit message format',
                ruleType: 'NAMING_CONVENTION',
                content: 'type: subject',
                scope: 'DEFAULT'
              },
              {
                id: 'rule6',
                name: 'PullRequestTemplate',
                description: 'Default PR template',
                ruleType: 'WORKFLOW',
                content: 'Standard PR template',
                scope: 'DEFAULT'
              }
            ]
          };
        }
        return { queryRule: [] };
      }
      
      // Look for workflow queries
      if (query.includes('queryWorkflow')) {
        if (variables.level === 'PROJECT' && variables.id === 'proj123') {
          return {
            queryWorkflow: [
              {
                id: 'workflow1',
                name: 'BugFix',
                description: 'Project-specific bug fix workflow',
                appliesToTaskType: 'TASK',
                scope: 'PROJECT',
                steps: [
                  {
                    id: 'step1',
                    name: 'Reproduce',
                    description: 'Reproduce the bug',
                    stepOrder: 1,
                    requiredRole: 'BACKEND_ENGINEER',
                    expectedSubTaskType: 'CODE',
                    isOptional: false,
                    nextStep: { id: 'step2' }
                  },
                  {
                    id: 'step2',
                    name: 'Fix',
                    description: 'Fix the bug',
                    stepOrder: 2,
                    requiredRole: 'BACKEND_ENGINEER',
                    expectedSubTaskType: 'CODE',
                    isOptional: false,
                    nextStep: { id: 'step3' }
                  },
                  {
                    id: 'step3',
                    name: 'SecurityScan',
                    description: 'Run security scan',
                    stepOrder: 3,
                    requiredRole: 'QA_TESTER',
                    expectedSubTaskType: 'TEST',
                    isOptional: false,
                    nextStep: { id: 'step4' }
                  },
                  {
                    id: 'step4',
                    name: 'Test',
                    description: 'Test the fix',
                    stepOrder: 4,
                    requiredRole: 'QA_TESTER',
                    expectedSubTaskType: 'TEST',
                    isOptional: false
                  }
                ]
              }
            ]
          };
        } else if (variables.level === 'DEFAULT') {
          return {
            queryWorkflow: [
              {
                id: 'workflow2',
                name: 'BugFix',
                description: 'Default bug fix workflow',
                appliesToTaskType: 'TASK',
                scope: 'DEFAULT',
                steps: [
                  {
                    id: 'step5',
                    name: 'Reproduce',
                    description: 'Reproduce the bug',
                    stepOrder: 1,
                    requiredRole: 'BACKEND_ENGINEER',
                    expectedSubTaskType: 'CODE',
                    isOptional: false,
                    nextStep: { id: 'step6' }
                  },
                  {
                    id: 'step6',
                    name: 'Fix',
                    description: 'Fix the bug',
                    stepOrder: 2,
                    requiredRole: 'BACKEND_ENGINEER',
                    expectedSubTaskType: 'CODE',
                    isOptional: false,
                    nextStep: { id: 'step7' }
                  },
                  {
                    id: 'step7',
                    name: 'Test',
                    description: 'Test the fix',
                    stepOrder: 3,
                    requiredRole: 'QA_TESTER',
                    expectedSubTaskType: 'TEST',
                    isOptional: false
                  }
                ]
              }
            ]
          };
        }
        return { queryWorkflow: [] };
      }
      
      // Look for persona queries
      if (query.includes('queryPersona')) {
        if (variables.level === 'PROJECT' && variables.id === 'proj123') {
          return {
            queryPersona: [
              {
                id: 'persona1',
                role: 'BACKEND_ENGINEER',
                description: 'Project-specific backend engineer persona',
                promptTemplate: 'You are a backend engineer focused on security...',
                scope: 'PROJECT'
              }
            ]
          };
        } else if (variables.level === 'DEFAULT') {
          return {
            queryPersona: [
              {
                id: 'persona2',
                role: 'BACKEND_ENGINEER',
                description: 'Default backend engineer persona',
                promptTemplate: 'You are a backend engineer...',
                scope: 'DEFAULT'
              }
            ]
          };
        }
        return { queryPersona: [] };
      }
      
      return {};
    });
    
    // Mock executeMutation for update operations
    mockDb.executeMutation = jest.fn().mockImplementation((mutation, variables) => {
      if (mutation.includes('addRule')) {
        return { 
          addRule: { 
            rule: { 
              id: uuidv4() 
            } 
          } 
        };
      }
      
      if (mutation.includes('addWorkflow')) {
        return { 
          addWorkflow: { 
            workflow: { 
              id: uuidv4() 
            } 
          } 
        };
      }
      
      if (mutation.includes('addPersona')) {
        return { 
          addPersona: { 
            persona: { 
              id: uuidv4() 
            } 
          } 
        };
      }
      
      if (mutation.includes('updateUser') || 
          mutation.includes('updateProject') || 
          mutation.includes('updateTeam') || 
          mutation.includes('updateOrganization')) {
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
  
  test('resolveConfigByScope should resolve rules from most specific to least specific scope', async () => {
    const result = await queryCkg({
      queryType: 'resolveConfigByScope',
      parameters: {
        contextScope: {
          userId: 'user123',
          projectId: 'proj123',
          teamId: 'team123',
          orgId: 'org123'
        },
        neededContext: ['rules']
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data.rules).toBeDefined();
    
    // Check that the most specific rule (USER) overrides the default one
    expect(result.data.rules.overrideRules.CommitMessageFormat.scope).toBe('USER');
    expect(result.data.rules.overrideRules.CommitMessageFormat.content).toBe('feat(scope): subject');
    
    // Check that we still have the default rule that wasn't overridden
    expect(result.data.rules.overrideRules.PullRequestTemplate.scope).toBe('DEFAULT');
    
    // Check that compositional rules from different scopes are collected
    expect(result.data.rules.compositionalRules.SECURITY).toBeDefined();
    expect(result.data.rules.compositionalRules.CODE_STANDARD).toBeDefined();
  });
  
  test('resolveConfigByScope should resolve workflow from project scope over default', async () => {
    const result = await queryCkg({
      queryType: 'resolveConfigByScope',
      parameters: {
        contextScope: {
          projectId: 'proj123'
        },
        neededContext: ['workflow']
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data.workflow).toBeDefined();
    
    // Check that we got the project-specific workflow
    expect(result.data.workflow.scope).toBe('PROJECT');
    
    // Verify the workflow has the security scan step (which is only in the project workflow)
    const securityStep = result.data.workflow.steps.find(step => step.name === 'SecurityScan');
    expect(securityStep).toBeDefined();
    expect(securityStep.stepOrder).toBe(3);
  });
  
  test('resolveConfigByScope should fallback to default workflow when no override exists', async () => {
    const result = await queryCkg({
      queryType: 'resolveConfigByScope',
      parameters: {
        contextScope: {
          teamId: 'team123'  // No workflow at team level
        },
        neededContext: ['workflow']
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data.workflow).toBeDefined();
    
    // Check that we got the default workflow
    expect(result.data.workflow.scope).toBe('DEFAULT');
    
    // Verify the workflow has only 3 steps (the default workflow)
    expect(result.data.workflow.steps.length).toBe(3);
  });
  
  test('resolveConfigByScope should resolve persona from project scope over default', async () => {
    const result = await queryCkg({
      queryType: 'resolveConfigByScope',
      parameters: {
        contextScope: {
          projectId: 'proj123'
        },
        neededContext: ['persona']
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data.persona).toBeDefined();
    
    // Check that we got the project-specific persona
    expect(result.data.persona.scope).toBe('PROJECT');
    expect(result.data.persona.promptTemplate).toContain('security');
  });
  
  test('createScopedConfig should create a rule with the correct scope', async () => {
    const result = await updateCkg({
      updateType: 'createScopedConfig',
      parameters: {
        configType: 'Rule',
        scope: 'PROJECT',
        scopeEntityId: 'proj123',
        configData: {
          name: 'NewRule',
          description: 'A new project-specific rule',
          ruleType: 'CODE_STANDARD',
          content: 'New rule content'
        }
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data.configId).toBeDefined();
    
    // Check that both mutations were called (create rule and link to project)
    expect(mockDb.executeMutation).toHaveBeenCalledTimes(2);
  });
  
  test('createScopedConfig should create a default-scoped rule without entity ID', async () => {
    const result = await updateCkg({
      updateType: 'createScopedConfig',
      parameters: {
        configType: 'Rule',
        scope: 'DEFAULT',
        configData: {
          name: 'DefaultRule',
          description: 'A default rule',
          ruleType: 'CODE_STANDARD',
          content: 'Default rule content'
        }
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data.configId).toBeDefined();
    
    // Check that only the create mutation was called (no linking needed for DEFAULT)
    expect(mockDb.executeMutation).toHaveBeenCalledTimes(1);
  });
});
