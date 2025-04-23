/**
 * Tree-sitter parser initialization and management
 */

import Parser from 'web-tree-sitter';
import path from 'path';
import { logger } from '../../../utils/logger';

// Default path to WASM grammar files
const TREE_SITTER_WASM_PATH = process.env.TREE_SITTER_WASM_PATH || './wasm';

// Parsers for different languages
let parsers: { [key: string]: Parser | null } = {
  ts: null,
  js: null,
  py: null,
};

/**
 * Initialize Tree-sitter parsers
 * Should be called once at startup before any parsing is attempted
 */
export async function initializeParsers(): Promise<void> {
  if (Object.values(parsers).every(p => p !== null)) return;
  
  logger.info('Initializing Tree-sitter parsers...');
  
  try {
    await Parser.init(); // Initialize the library itself

    const loadGrammar = async (lang: string, file: string) => {
      try {
        const absolutePath = path.resolve(TREE_SITTER_WASM_PATH, file);
        logger.debug(`Attempting to load grammar: ${absolutePath}`);
        return await Parser.Language.load(absolutePath);
      } catch (grammarError) {
        logger.error(`Failed to load grammar for ${lang} from ${file}:`, grammarError);
        return null; // Return null if a specific grammar fails
      }
    };

    // Load grammars concurrently
    const [LangTSX, LangJS, LangPY] = await Promise.all([
      loadGrammar('TSX', 'tree-sitter-tsx.wasm'),
      loadGrammar('JS', 'tree-sitter-javascript.wasm'),
      loadGrammar('PY', 'tree-sitter-python.wasm'),
    ]);

    // Assign parsers only if grammars loaded successfully
    if (LangTSX) {
      parsers.ts = new Parser();
      parsers.ts.setLanguage(LangTSX); // TSX handles TS and JSX
      parsers.js = parsers.ts; // Use TSX parser for JS/JSX too
      logger.info('Initialized TS/TSX/JS/JSX parser.');
    } else {
      logger.warn('TS/TSX/JS parser initialization failed.');
    }

    if (LangPY) {
      parsers.py = new Parser();
      parsers.py.setLanguage(LangPY);
      logger.info('Initialized Python parser.');
    } else {
      logger.warn('Python parser initialization failed.');
    }

    if (Object.values(parsers).some(p => p !== null)) {
      logger.info('Tree-sitter initialization complete.');
    } else {
      logger.error('FATAL: No Tree-sitter parsers could be initialized. Code parsing will be disabled.');
    }

  } catch (error) {
    logger.error("FATAL: Failed to initialize Tree-sitter library:", error);
    parsers = { ts: null, js: null, py: null }; // Ensure all are null on failure
    throw new Error("Failed to initialize Tree-sitter library: " + error.message);
  }
}

/**
 * Get the appropriate parser for a file extension
 * @param ext File extension (e.g., '.ts', '.py')
 * @returns Parser instance or null if no suitable parser is available
 */
export function getParserForExtension(ext: string): Parser | null {
  if (ext === '.ts' || ext === '.tsx') return parsers.ts;
  if (ext === '.js' || ext === '.jsx') return parsers.js; // Use ts parser for js/jsx
  if (ext === '.py') return parsers.py;
  return null;
}

/**
 * Parse code content with the appropriate parser
 * @param content Code content to parse
 * @param ext File extension
 * @returns Parse tree or null if parsing failed
 */
export function parseCode(content: string, ext: string): Parser.Tree | null {
  const parser = getParserForExtension(ext);
  if (!parser) return null;
  
  try {
    return parser.parse(content);
  } catch (error) {
    logger.error(`Error parsing code with extension ${ext}:`, error);
    return null;
  }
}

/**
 * Get default Tree-sitter queries for different node types
 * @param language Language to get queries for ('ts', 'js', 'py')
 * @returns Object with query strings
 */
export function getDefaultQueries(language: string): Record<string, string> {
  // Base queries for TS/JS
  const tsQueries = {
    function: '(function_declaration name: (identifier) @name) @function',
    class: '(class_declaration name: (identifier) @name) @class',
    interface: '(interface_declaration name: (identifier) @name) @interface',
    import: '(import_statement source: (string_fragment) @source) @import', 
    call: '(call_expression function: [ (identifier) @call_name (member_expression property: (identifier) @call_name) ]) @call'
  };
  
  // Python-specific queries
  const pyQueries = {
    function: '(function_definition name: (identifier) @name) @function',
    class: '(class_definition name: (identifier) @name) @class',
    import: '(import_statement module_name: (dotted_name (identifier) @source)) @import',
    import_from: '(import_from_statement module_name: (_) @source (dotted_name (identifier) @import_name)) @import',
    call: '(call function: [ (identifier) @call_name (attribute attribute: (identifier) @call_name) ]) @call'
  };
  
  if (language === 'py') return pyQueries;
  return tsQueries; // Default to TS/JS queries
}
