/**
 * EntityExtractor for code and text analysis
 */

import Parser from 'web-tree-sitter';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { 
  RelationshipType, 
  TempRelationship 
} from '../common/types';
import {
  FileNodeSchema,
  FunctionNodeSchema,
  ClassNodeSchema,
  InterfaceNodeSchema,
  ProjectContextNodeSchema,
  RuleNodeSchema,
  PersonaNodeSchema,
  LlmExtractionSchema
} from '../common/schemas';
import { logger } from '../../../utils/logger';
import { getParserForExtension, getDefaultQueries } from './parser';

export class EntityExtractor {
  private llmClient: OpenAI | null = null;
  private llmModel: string;
  private llmTimeout: number;
  
  /**
   * Constructor for EntityExtractor
   * @param openRouterApiKey API key for OpenRouter (optional)
   * @param openRouterBaseUrl Base URL for OpenRouter API (optional)
   * @param llmModel Model to use for text extraction (optional)
   * @param llmTimeout Timeout for LLM API calls in ms (optional)
   */
  constructor(
    openRouterApiKey?: string,
    openRouterBaseUrl: string = 'https://openrouter.ai/api/v1',
    llmModel: string = 'anthropic/claude-3.5-sonnet',
    llmTimeout: number = 90000
  ) {
    this.llmModel = llmModel;
    this.llmTimeout = llmTimeout;
    
    if (openRouterApiKey) {
      this.llmClient = new OpenAI({
        baseURL: openRouterBaseUrl,
        apiKey: openRouterApiKey,
        timeout: llmTimeout,
      });
      logger.info("LLM Client initialized via OpenRouter.");
    } else {
      logger.warn("No OpenRouter API key provided. LLM-based text extraction will be disabled.");
    }
  }
  
  /**
   * Generates a unique key for nodes before they have a UID
   * Important for linking relationships correctly during initial build
   * @param nodeData Node data with type and identifying properties
   * @returns Unique string key
   */
  generateNodeKey(nodeData: any): string {
    const type = nodeData['dgraph.type'];
    switch (type) {
      case 'File':
        return `File::${nodeData.path}`;
      case 'Function':
        return `Function::${nodeData.filePath}::${nodeData.name}::L${nodeData.startLine || 0}`;
      case 'Class':
      case 'Interface':
        return `${type}::${nodeData.filePath}::${nodeData.name}::L${nodeData.startLine || 0}`;
      case 'ProjectContext':
      case 'Rule':
      case 'Persona':
      case 'Workflow':
      case 'WorkflowStep':
        // Assume name is unique within its type/scope for config items
        return `${type}::${nodeData.scope || 'DEFAULT'}::${nodeData.name}`;
      default:
        // Fallback using application UUID if available
        return nodeData.id || `${type}::${uuidv4()}`; // Ensure unique key even if name is missing
    }
  }
  
  /**
   * Extracts code entities from a parsed syntax tree
   * @param projectRoot Project root path
   * @param filePath Path to the file being parsed
   * @param tree Parse tree from Tree-sitter
   * @returns Object containing nodes and relationships
   */
  extractCodeEntities(
    projectRoot: string, 
    filePath: string, 
    tree: Parser.Tree
  ): { nodes: any[], relationships: TempRelationship[] } {
    const nodes: any[] = [];
    const relationships: TempRelationship[] = [];
    const relativePath = path.relative(projectRoot, filePath);
    const fileNodeData = {
      'dgraph.type': 'File',
      path: relativePath,
      name: path.basename(filePath),
      fileType: path.extname(filePath),
      id: uuidv4() // Generate consistent ID
    };
    const fileKey = this.generateNodeKey(fileNodeData);

    // Validate and create File node
    try {
      const fileNode = FileNodeSchema.parse(fileNodeData);
      nodes.push(fileNode);
    } catch (e) {
      logger.error(`Validation error for File node ${filePath}:`, e);
      return { nodes: [], relationships: [] }; // Skip file if basic node fails
    }

    const parser = getParserForExtension(path.extname(filePath));
    if (!parser || !tree.rootNode) return { nodes, relationships };

    // Get the appropriate queries based on file extension
    const fileExt = path.extname(filePath).substring(1); // Remove the dot
    const language = fileExt === 'py' ? 'py' : 'ts'; // Default to TypeScript for JS/TS files
    const queries = getDefaultQueries(language);

    try {
      const lang = parser.getLanguage();

      // Helper to run query and process captures
      const runQuery = (queryName: string, node: Parser.SyntaxNode, callback: (captures: Parser.QueryCapture[], match: Parser.QueryMatch) => void) => {
        if (!queries[queryName]) {
          logger.debug(`No query defined for ${queryName} in language ${language}`);
          return;
        }
        
        try {
          const query = lang.query(queries[queryName]);
          const matches = query.matches(node);
          matches.forEach(match => callback(match.captures, match));
        } catch (e) {
          logger.warn(`Tree-sitter query failed for ${queryName} in ${filePath}:`, e);
        }
      };

      // Process Top-Level Declarations (Functions, Classes, Interfaces)
      runQuery('function', tree.rootNode, (captures) => {
        const funcNode = captures.find(c => c.name === 'function')?.node;
        const nameNode = captures.find(c => c.name === 'name')?.node;
        if (funcNode && nameNode) {
          const funcName = nameNode.text;
          const startLine = funcNode.startPosition.row + 1; // 1-based line numbers
          const endLine = funcNode.endPosition.row + 1;
          
          try {
            const nodeData = FunctionNodeSchema.parse({
              'dgraph.type': 'Function', 
              name: funcName, 
              filePath: relativePath, 
              startLine, 
              endLine,
              id: uuidv4()
            });
            
            const funcKey = this.generateNodeKey(nodeData);
            nodes.push(nodeData);
            relationships.push({ 
              sourceKey: fileKey, 
              type: RelationshipType.CONTAINS, 
              targetKey: funcKey 
            });
            
            // Process calls inside this function
            runQuery('call', funcNode, (callCaptures) => {
              const callNameNode = callCaptures.find(c => c.name === 'call_name')?.node;
              if (callNameNode) {
                const targetKey = `FUNC_CALL_TARGET::${callNameNode.text}`; // Needs resolution
                relationships.push({ 
                  sourceKey: funcKey, 
                  type: RelationshipType.CALLS, 
                  targetKey 
                });
              }
            });
          } catch (e) { 
            logger.error(`Validation error for Function ${funcName}:`, e); 
          }
        }
      });

      runQuery('class', tree.rootNode, (captures) => {
        const classNodeSyntax = captures.find(c => c.name === 'class')?.node;
        const nameNode = captures.find(c => c.name === 'name')?.node;
        if (classNodeSyntax && nameNode) {
          const className = nameNode.text;
          const startLine = classNodeSyntax.startPosition.row + 1;
          const endLine = classNodeSyntax.endPosition.row + 1;
          
          try {
            const nodeData = ClassNodeSchema.parse({
              'dgraph.type': 'Class', 
              name: className, 
              filePath: relativePath, 
              startLine, 
              endLine,
              id: uuidv4()
            });
            
            const classKey = this.generateNodeKey(nodeData);
            nodes.push(nodeData);
            relationships.push({ 
              sourceKey: fileKey, 
              type: RelationshipType.CONTAINS, 
              targetKey: classKey 
            });
          } catch (e) { 
            logger.error(`Validation error for Class ${className}:`, e); 
          }
        }
      });

      // Process interfaces (TypeScript only)
      if (queries.interface) {
        runQuery('interface', tree.rootNode, (captures) => {
          const interfaceNodeSyntax = captures.find(c => c.name === 'interface')?.node;
          const nameNode = captures.find(c => c.name === 'name')?.node;
          if (interfaceNodeSyntax && nameNode) {
            const interfaceName = nameNode.text;
            const startLine = interfaceNodeSyntax.startPosition.row + 1;
            const endLine = interfaceNodeSyntax.endPosition.row + 1;
            
            try {
              const nodeData = InterfaceNodeSchema.parse({
                'dgraph.type': 'Interface', 
                name: interfaceName, 
                filePath: relativePath, 
                startLine, 
                endLine,
                id: uuidv4()
              });
              
              const interfaceKey = this.generateNodeKey(nodeData);
              nodes.push(nodeData);
              relationships.push({ 
                sourceKey: fileKey, 
                type: RelationshipType.CONTAINS, 
                targetKey: interfaceKey 
              });
            } catch (e) { 
              logger.error(`Validation error for Interface ${interfaceName}:`, e); 
            }
          }
        });
      }

      // Process Imports (simplified - needs resolution logic)
      const processImport = (captures: Parser.QueryCapture[]) => {
        const sourceNode = captures.find(c => c.name === 'source')?.node;
        if (sourceNode) {
          const importSource = sourceNode.text.replace(/['"\`]/g, '');
          const targetKey = `IMPORT_TARGET::${importSource}`;
          relationships.push({ 
            sourceKey: fileKey, 
            type: RelationshipType.IMPORTS, 
            targetKey 
          });
        }
      };
      
      runQuery('import', tree.rootNode, processImport);
      
      // Handle Python's import_from if needed
      if (queries.import_from) {
        runQuery('import_from', tree.rootNode, processImport);
      }

    } catch (error) {
      logger.error(`Error during tree-sitter processing for ${filePath}:`, error);
    }

    logger.debug(`Extracted ${nodes.length - 1} code entities from ${filePath}`);
    return { nodes, relationships };
  }
  
  /**
   * Extracts structured information from text content using LLM
   * @param projectRoot Project root path
   * @param filePath Path to the text file
   * @param textContent Text content to analyze
   * @param contextType Type of context document
   * @returns Object containing nodes and relationships
   */
  async extractTextEntities(
    projectRoot: string, 
    filePath: string, 
    textContent: string, 
    contextType: string
  ): Promise<{ nodes: any[], relationships: TempRelationship[] }> {
    if (!this.llmClient) {
      logger.warn("LLM client not available, skipping text entity extraction.");
      return { nodes: [], relationships: [] };
    }

    const nodes: any[] = [];
    const relationships: TempRelationship[] = [];
    const relativePath = path.relative(projectRoot, filePath);

    // Construct prompt using XML tags and clear instructions
    const prompt = `
      Analyze the following ${contextType} content from the file "${relativePath}".
      Your task is to extract key structured entities and their relationships relevant to software development context.
      Focus on identifying distinct Requirements, Architectural Decisions, Standards, Rules, Personas, Workflows, Workflow Steps, or other significant Project Context entities.
      Also identify relationships BETWEEN these extracted entities, or FROM an extracted entity TO an external code element (function, class, file) or configuration item (rule name, workflow name) mentioned in the text.

      <instructions>
      1. Read the document content carefully.
      2. Identify distinct conceptual entities. Assign a unique, concise, readable 'id' to each entity within this document.
      3. Extract the 'type', 'name' (if applicable), and a brief 'description' for each entity. If the entity is a Rule, Persona, or Workflow, also extract its 'scope' (defaulting to PROJECT if unspecified).
      4. Identify relationships. Use the internal 'id's for source/target if both are defined in this document. Use 'targetExternalRef' if the target is mentioned but not defined here (e.g., a function name).
      5. Use relationship types like RELATES_TO, DEFINES, IMPLEMENTS_REQ, BASED_ON_DECISION, APPLIES_TO, CONTAINS_STEP where appropriate.
      6. Format the output *strictly* as a JSON object matching the provided schema. Ensure all keys and values adhere to the schema definition.
      7. If no relevant entities or relations are found, return an empty JSON object: {}.
      </instructions>

      <json_schema>
      ${JSON.stringify(LlmExtractionSchema.shape, null, 2)}
      </json_schema>

      <document_content>
      ${textContent.substring(0, 20000)}
      </document_content>

      <thinking>
      1. Scan document for keywords and structure indicating different entity types (Req IDs, ADR format, Rule definitions, etc.).
      2. Extract each entity, assign unique ID, determine type, name, description, scope.
      3. Re-scan to find links between extracted entities or links to external code/config references.
      4. Format as JSON according to schema.
      </thinking>

      JSON Output:
    `;

    try {
      logger.info(`Requesting LLM extraction for ${relativePath}...`);
      const response = await this.llmClient.chat.completions.create({
        model: this.llmModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });
      
      const jsonOutput = response.choices[0]?.message?.content;
      if (!jsonOutput) throw new Error('LLM returned empty content');

      // Validate and parse the LLM output
      const parsed = LlmExtractionSchema.parse(JSON.parse(jsonOutput));
      const entityIdToKeyMap = new Map<string, string>();

      // Create CKG nodes from extracted entities
      (parsed.entities || []).forEach(entity => {
        // Map LLM entity type to CKG dgraph.type
        let dgraphType = 'ProjectContext'; // Default
        if (['Requirement', 'DesignSpec', 'ArchDecision', 'Rule', 'Persona', 'Workflow', 'WorkflowStep'].includes(entity.type)) {
          dgraphType = entity.type;
        }

        const nodeKey = `${dgraphType}::${relativePath}::${entity.id}`; // Composite key
        entityIdToKeyMap.set(entity.id, nodeKey);

        try {
          // Use specific Zod schema if type matches, else generic ProjectContext
          let nodeData: any;
          const baseData = {
            'dgraph.type': dgraphType,
            name: entity.name || entity.id,
            description: entity.description,
            filePath: relativePath,
            contentType: entity.type,
            id: uuidv4() // Generate app UUID
          };

          if (dgraphType === 'Rule') {
            nodeData = RuleNodeSchema.parse({
              ...baseData,
              ruleType: entity.ruleType || 'UNKNOWN', // Add defaults if needed
              content: entity.description || 'N/A', // Assume content is in description if not separate
              scope: entity.scope || 'PROJECT',
              isActive: true,
            });
          } else if (dgraphType === 'Persona') {
            nodeData = PersonaNodeSchema.parse({
              ...baseData,
              role: entity.role || 'UNKNOWN',
              promptTemplate: entity.description || 'N/A', // Assume template is in description
              scope: entity.scope || 'PROJECT',
              isActive: true,
            });
          } else {
            nodeData = ProjectContextNodeSchema.parse(baseData);
          }
          
          nodes.push(nodeData);
        } catch (validationError) {
          logger.error(`Validation error for extracted entity ${entity.id} (${entity.type}) in ${relativePath}:`, validationError);
        }
      });

      // Store relationships temporarily, resolve UIDs later
      (parsed.relations || []).forEach(rel => {
        const sourceKey = entityIdToKeyMap.get(rel.sourceEntityId);
        if (!sourceKey) {
          logger.warn(`Could not find source entity key for ID: ${rel.sourceEntityId} in file ${relativePath}`);
          return;
        }

        let targetKey: string | undefined;
        if (rel.targetEntityId) {
          targetKey = entityIdToKeyMap.get(rel.targetEntityId);
          if (!targetKey) {
            logger.warn(`Could not find internal target entity key for ID: ${rel.targetEntityId} in file ${relativePath}`);
            targetKey = rel.targetExternalRef ? `EXTERNAL_REF::${rel.targetExternalRef}` : undefined;
          }
        } else if (rel.targetExternalRef) {
          targetKey = `EXTERNAL_REF::${rel.targetExternalRef}`; // Placeholder
        }

        if (targetKey) {
          let relationType: RelationshipType;
          // Try to map to known relationship types
          try {
            relationType = RelationshipType[rel.relationType.toUpperCase() as keyof typeof RelationshipType];
          } catch (e) {
            // Default to RELATES_TO for unknown types
            relationType = RelationshipType.RELATES_TO;
            logger.warn(`Unknown relationship type: ${rel.relationType}, defaulting to RELATES_TO`);
          }
          
          relationships.push({
            sourceKey: sourceKey,
            type: relationType,
            targetKey: targetKey
          });
        } else {
          logger.warn(`Could not determine target for relation from ${rel.sourceEntityId} in file ${relativePath}`);
        }
      });

      logger.info(`LLM extraction successful for ${relativePath}. Found ${nodes.length} entities.`);

    } catch (error) {
      logger.error(`Error extracting/parsing text entities from ${relativePath}:`, error);
    }

    return { nodes, relationships };
  }
}

export default EntityExtractor;
