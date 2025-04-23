/**
 * CKG Construction Service (Project Analyzer)
 * Scans project files, analyzes code and documentation, and populates the CKG
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { DgraphClient } from '../../../db/dgraph-client';
import { EntityExtractor } from './extractor';
import { TempRelationship, ProjectAnalyzerConfig } from '../common/types';
import { parseCode } from './parser';
import { logger } from '../../../utils/logger';

// Default configuration values
const DEFAULT_CONFIG: ProjectAnalyzerConfig = {
  dgraphEndpoint: process.env.WARP_DGRAPH_ENDPOINT || 'localhost:9080',
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  llmExtractionModel: process.env.WARP_LLM_EXTRACTION_MODEL || 'anthropic/claude-3.5-sonnet',
  contextFilePattern: /\.md$/i,
  configFileName: 'warp_init.yaml',
  contextDirName: '.warp_context',
  supportedCodeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.py'],
  treeSitterWasmPath: process.env.TREE_SITTER_WASM_PATH || './wasm',
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
  llmTimeoutMs: 90 * 1000, // 90 seconds
  batchSizeNodes: 100,
  batchSizeRelationships: 200
};

export class CKGConstructionService {
  private config: ProjectAnalyzerConfig;
  private dbClient: DgraphClient;
  private extractor: EntityExtractor;
  private projectRoot: string = '';

  /**
   * Constructor
   * @param config Configuration options (optional)
   */
  constructor(config: Partial<ProjectAnalyzerConfig> = {}) {
    // Merge provided config with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    
    // Initialize the Dgraph client
    this.dbClient = new DgraphClient(this.config.dgraphEndpoint);
    
    // Initialize the entity extractor with LLM capabilities if API key is available
    this.extractor = new EntityExtractor(
      this.config.openRouterApiKey,
      this.config.openRouterBaseUrl,
      this.config.llmExtractionModel,
      this.config.llmTimeoutMs
    );
    
    logger.info('CKG Construction Service initialized.');
  }

  /**
   * Initialize the Dgraph schema if needed
   */
  async initializeSchema(): Promise<void> {
    logger.info('Checking Dgraph connection and schema...');
    const isAvailable = await this.dbClient.isAvailable();
    if (!isAvailable) {
      throw new Error('Dgraph server is not available. Please ensure Dgraph is running and accessible.');
    }
    
    // The schema is already managed by the main application's init-schema script
    // We don't need to reinitialize it here, but we should check if necessary types exist
    logger.info('Dgraph connection confirmed.');
  }

  /**
   * Main method to build the CKG from a project directory
   * @param projectPath Path to the project root directory
   */
  async buildCKG(projectPath: string): Promise<void> {
    this.projectRoot = path.resolve(projectPath);
    logger.info(`Starting CKG build for project: ${this.projectRoot}`);
    
    // Ensure Dgraph is available
    await this.initializeSchema();

    const allNodes: any[] = [];
    const tempRelationships: TempRelationship[] = [];

    // 1. Scan project directory
    const filesToProcess = await this.scanDirectory(this.projectRoot);
    logger.info(`Found ${filesToProcess.length} files to process.`);

    // 2. Process Code Files
    logger.info("Processing code files...");
    for (const filePath of filesToProcess) {
      if (await this.shouldSkipFile(filePath)) continue;

      const ext = path.extname(filePath).toLowerCase();
      if (this.config.supportedCodeExtensions!.includes(ext)) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const tree = parseCode(content, ext);
          
          if (tree) {
            const { nodes, relationships } = this.extractor.extractCodeEntities(this.projectRoot, filePath, tree);
            allNodes.push(...nodes);
            tempRelationships.push(...relationships);
          }
        } catch (error) {
          logger.error(`Error parsing code file ${path.relative(this.projectRoot, filePath)}:`, error);
        }
      }
    }

    // 3. Process Context Files
    logger.info("Processing context files...");
    const contextDirPath = path.join(this.projectRoot, this.config.contextDirName!);
    try {
      // Check if context dir exists before scanning
      await fs.access(contextDirPath);
      const contextFiles = await this.scanDirectory(contextDirPath);
      
      for (const filePath of contextFiles) {
        if (await this.shouldSkipFile(filePath)) continue;

        if (this.config.contextFilePattern!.test(filePath)) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const contextType = path.basename(filePath).split('.')[0] || 'GenericContext';
            const { nodes, relationships } = await this.extractor.extractTextEntities(this.projectRoot, filePath, content, contextType);
            allNodes.push(...nodes);
            tempRelationships.push(...relationships);
          } catch (error) {
            logger.error(`Error processing context file ${path.relative(this.projectRoot, filePath)}:`, error);
          }
        }
      }
    } catch (error) {
      // Only log error if it's not "Not Found"
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error(`Error accessing context directory ${contextDirPath}:`, error);
      } else {
        logger.info(`Context directory not found: ${contextDirPath}`);
      }
    }

    // 4. Load Initial Config (Rules, Personas, Workflows)
    logger.info("Loading initial configuration...");
    const initialConfig = await this.loadInitialConfig(this.projectRoot);
    
    // Add config nodes from the loaded configuration
    initialConfig.rules.forEach(r => allNodes.push({
      ...r, 
      'dgraph.type': 'Rule',
      scope: r.scope || 'DEFAULT'
    }));
    
    initialConfig.personas.forEach(p => allNodes.push({
      ...p, 
      'dgraph.type': 'Persona', 
      scope: p.scope || 'DEFAULT'
    }));
    
    initialConfig.workflows.forEach(wf => {
      const wfNode = {
        ...wf, 
        'dgraph.type': 'Workflow', 
        scope: wf.scope || 'DEFAULT'
      };
      const wfKey = this.extractor.generateNodeKey(wfNode);
      allNodes.push(wfNode);
      
      // Process workflow steps
      (wf.steps || []).forEach((step: any, index: number) => {
        const stepNode = {
          ...step,
          'dgraph.type': 'WorkflowStep',
          stepOrder: step.stepOrder ?? index + 1
        };
        const stepKey = this.extractor.generateNodeKey({...stepNode, 'dgraph.type': 'WorkflowStep'});
        allNodes.push(stepNode);
        
        // Add relationships between workflow and steps
        tempRelationships.push({ 
          sourceKey: wfKey, 
          type: TempRelationship.STEPS, 
          targetKey: stepKey 
        });
        tempRelationships.push({ 
          sourceKey: stepKey, 
          type: TempRelationship.WORKFLOW, 
          targetKey: wfKey 
        });
      });
    });

    // 5. Populate Graph Database - Nodes First
    logger.info(`Upserting ${allNodes.length} nodes to Dgraph...`);
    
    // Use batching for efficiency
    for (let i = 0; i < allNodes.length; i += this.config.batchSizeNodes!) {
      const batch = allNodes.slice(i, i + this.config.batchSizeNodes!);
      // Convert to format expected by the Dgraph client
      const mutationData = {
        set: batch.map(node => {
          // Generate unique blank node variable for each node
          const blankNodeVar = `_:node${i}_${batch.indexOf(node)}`;
          return {
            ...node,
            uid: blankNodeVar
          };
        })
      };
      
      try {
        await this.dbClient.mutate(mutationData);
        logger.debug(`Processed batch of ${batch.length} nodes`);
      } catch (error) {
        logger.error(`Error upserting node batch (index ${i}):`, error);
      }
    }

    // 6. Query nodes to get UIDs
    // This is a simplified approach - in a real implementation you'd need more sophisticated
    // resolution logic to properly link relationships after node creation
    
    logger.info(`Resolving relationships...`);
    // In a real implementation, this would use proper resolution logic to match nodes
    // and create the relationships between them
    
    logger.info('CKG build process completed.');
  }

  /**
   * Helper to check if file should be skipped based on size or other criteria
   * @param filePath Path to the file
   * @returns Boolean indicating if file should be skipped
   */
  private async shouldSkipFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.config.maxFileSizeBytes!) {
        logger.info(`Skipping large file: ${path.relative(this.projectRoot, filePath)} (${(stats.size / (1024*1024)).toFixed(2)} MB)`);
        return true;
      }
      // Add other skip conditions if needed (e.g., binary file detection)
    } catch (error) {
      logger.error(`Error getting stats for file ${filePath}:`, error);
      return true; // Skip if stats fail
    }
    return false;
  }

  /**
   * Helper to recursively scan directories, ignoring common build/dependency folders
   * @param dirPath Directory to scan
   * @param allFiles Accumulator for file paths
   * @returns Array of file paths
   */
  private async scanDirectory(dirPath: string, allFiles: string[] = []): Promise<string[]> {
    const ignorePatterns = [
      'node_modules', '.git', '.DS_Store', 'dist', 'build', 'target', 
      'vendor', 'venv', '.venv', '__pycache__', '.hg', '.svn'
    ];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (ignorePatterns.includes(entry.name)) {
          continue;
        }
        
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, allFiles);
        } else if (entry.isFile()) {
          allFiles.push(fullPath);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error(`Error scanning directory ${dirPath}:`, error);
      }
    }
    
    return allFiles;
  }

  /**
   * Loads initial rules/personas/workflows from config file
   * @param projectPath Project root path
   * @returns Object containing rules, personas, and workflows
   */
  private async loadInitialConfig(projectPath: string): Promise<{
    rules: any[], 
    personas: any[], 
    workflows: any[]
  }> {
    const configFilePath = path.join(projectPath, this.config.configFileName!);
    logger.info(`Attempting to load initial config from ${configFilePath}...`);
    
    try {
      const fileContent = await fs.readFile(configFilePath, 'utf-8');
      const config = yaml.load(fileContent) as any;

      // Extract configuration sections
      const rules = config?.rules || [];
      const personas = config?.personas || [];
      const workflows = config?.workflows || [];

      logger.info(`Loaded ${rules.length} rules, ${personas.length} personas, ${workflows.length} workflows from config.`);
      return { rules, personas, workflows };

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info(`Initial config file not found: ${configFilePath}. Using empty defaults.`);
      } else {
        logger.error(`Error loading or parsing initial config file ${configFilePath}:`, error);
      }
      return { rules: [], personas: [], workflows: [] }; // Return empty defaults on error
    }
  }
}

export default CKGConstructionService;
