import fs from 'fs';
import path from 'path';
import { GraphDatabase } from './dgraph.js';

/**
 * Initializes the Dgraph schema with the enhanced schema definitions
 * that support hierarchical tasks, scoped configurations, and time-based traversal
 */
export async function initializeSchema(): Promise<void> {
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'schema', 'enhanced-schema.graphql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Initialize the database connection
    const DB_PATH = path.join(process.cwd(), '.warp_memory');
    const graphDb = new GraphDatabase('localhost:9080', DB_PATH);
    
    // Initialize the database
    await graphDb.initialize();
    
    // Apply the schema
    console.log('Applying enhanced schema to Dgraph...');
    await graphDb.applySchema(schema);
    console.log('Schema applied successfully');
    
    // Initialize default configurations
    await initializeDefaultConfigurations(graphDb);
    
    console.log('Initialization complete');
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw error;
  }
}

/**
 * Initializes default configurations (rules, workflows, personas)
 * that serve as the base layer in the scope hierarchy
 */
async function initializeDefaultConfigurations(graphDb: GraphDatabase): Promise<void> {
  try {
    console.log('Creating default configurations...');
    
    // Create default rules
    const defaultRules = [
      {
        name: 'CommitMessageFormat',
        description: 'Format for commit messages',
        ruleType: 'NAMING_CONVENTION',
        content: 'type: subject',
        scope: 'DEFAULT',
        isActive: true
      },
      {
        name: 'CodeStyle',
        description: 'Standard code style guidelines',
        ruleType: 'CODE_STANDARD',
        content: '2 space indentation, semicolons required',
        scope: 'DEFAULT',
        isActive: true
      },
      {
        name: 'SecurityChecks',
        description: 'Security guidelines for code',
        ruleType: 'SECURITY',
        content: 'No hardcoded secrets, validate all inputs',
        scope: 'DEFAULT',
        isActive: true
      }
    ];
    
    for (const rule of defaultRules) {
      const mutation = `
        mutation CreateDefaultRule($input: [AddRuleInput!]!) {
          addRule(input: $input) {
            rule {
              id
              name
            }
          }
        }
      `;
      
      await graphDb.executeMutation(mutation, { input: [rule] });
    }
    
    // Create default workflows
    const bugFixWorkflow = {
      name: 'BugFix',
      description: 'Default workflow for bug fixes',
      appliesToTaskType: 'TASK',
      scope: 'DEFAULT',
      isActive: true,
      version: '1.0'
    };
    
    const createWorkflowMutation = `
      mutation CreateDefaultWorkflow($input: [AddWorkflowInput!]!) {
        addWorkflow(input: $input) {
          workflow {
            id
            name
          }
        }
      }
    `;
    
    const workflowResult = await graphDb.executeMutation(createWorkflowMutation, { 
      input: [bugFixWorkflow] 
    });
    
    const workflowId = workflowResult.addWorkflow.workflow.id;
    
    // Create workflow steps
    const workflowSteps = [
      {
        name: 'Reproduce',
        description: 'Reproduce the bug',
        stepOrder: 1,
        workflow: { id: workflowId },
        requiredRole: 'BACKEND_ENGINEER',
        expectedSubTaskType: 'CODE',
        isOptional: false
      },
      {
        name: 'Fix',
        description: 'Fix the bug',
        stepOrder: 2,
        workflow: { id: workflowId },
        requiredRole: 'BACKEND_ENGINEER',
        expectedSubTaskType: 'CODE',
        isOptional: false
      },
      {
        name: 'Test',
        description: 'Test the fix',
        stepOrder: 3,
        workflow: { id: workflowId },
        requiredRole: 'QA_TESTER',
        expectedSubTaskType: 'TEST',
        isOptional: false
      }
    ];
    
    // Add steps one by one to establish connections
    const stepIds = [];
    
    for (const step of workflowSteps) {
      const createStepMutation = `
        mutation CreateWorkflowStep($input: [AddWorkflowStepInput!]!) {
          addWorkflowStep(input: $input) {
            workflowStep {
              id
              name
            }
          }
        }
      `;
      
      const stepResult = await graphDb.executeMutation(createStepMutation, { 
        input: [step] 
      });
      
      stepIds.push(stepResult.addWorkflowStep.workflowStep.id);
    }
    
    // Link steps with nextStep / previousStep relationships
    for (let i = 0; i < stepIds.length - 1; i++) {
      const linkStepsMutation = `
        mutation LinkSteps($currentId: ID!, $nextId: ID!) {
          updateWorkflowStep(input: {
            filter: { id: { eq: $currentId } },
            set: { nextStep: { id: $nextId } }
          }) {
            workflowStep {
              id
            }
          }
          
          updateWorkflowStep(input: {
            filter: { id: { eq: $nextId } },
            set: { previousStep: { id: $currentId } }
          }) {
            workflowStep {
              id
            }
          }
        }
      `;
      
      await graphDb.executeMutation(linkStepsMutation, { 
        currentId: stepIds[i],
        nextId: stepIds[i + 1]
      });
    }
    
    // Create default personas
    const defaultPersonas = [
      {
        role: 'PRODUCT_LEAD',
        description: 'Default persona for Product Lead',
        promptTemplate: 'You are a Product Lead responsible for planning and prioritizing tasks...',
        scope: 'DEFAULT',
        isActive: true
      },
      {
        role: 'BACKEND_ENGINEER',
        description: 'Default persona for Backend Engineer',
        promptTemplate: 'You are a Backend Engineer responsible for implementing server-side logic...',
        scope: 'DEFAULT',
        isActive: true
      },
      {
        role: 'FRONTEND_ENGINEER',
        description: 'Default persona for Frontend Engineer',
        promptTemplate: 'You are a Frontend Engineer responsible for implementing user interfaces...',
        scope: 'DEFAULT',
        isActive: true
      },
      {
        role: 'QA_TESTER',
        description: 'Default persona for QA Tester',
        promptTemplate: 'You are a QA Tester responsible for verifying functionality and finding bugs...',
        scope: 'DEFAULT',
        isActive: true
      }
    ];
    
    for (const persona of defaultPersonas) {
      const mutation = `
        mutation CreateDefaultPersona($input: [AddPersonaInput!]!) {
          addPersona(input: $input) {
            persona {
              id
              role
            }
          }
        }
      `;
      
      await graphDb.executeMutation(mutation, { input: [persona] });
    }
    
    console.log('Default configurations created successfully');
  } catch (error) {
    console.error('Error creating default configurations:', error);
    throw error;
  }
}

// Execute if called directly
if (require.main === module) {
  initializeSchema()
    .then(() => {
      console.log('Schema initialization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Schema initialization failed:', error);
      process.exit(1);
    });
}
