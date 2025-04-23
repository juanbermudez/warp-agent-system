/**
 * Blueprint Loader for Warp Agent System
 * 
 * Handles loading and processing agent blueprints
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger';
import { AgentRole } from './session-manager';

/**
 * Blueprint content with processed sections
 */
export interface Blueprint {
  raw: string;
  sections: Map<string, string>;
  name: string;
  role: AgentRole;
  accessLevel: string[];
}

/**
 * BlueprintLoader handles loading and processing agent blueprints
 */
export class BlueprintLoader {
  private blueprintsPath: string;
  private cache: Map<string, Blueprint> = new Map();
  
  /**
   * Constructor
   * @param rootPath Project root path
   */
  constructor(rootPath: string) {
    this.blueprintsPath = path.join(rootPath, 'src', 'blueprints');
  }
  
  /**
   * Load a blueprint by role
   * @param role Agent role
   * @param useCache Whether to use cached blueprint if available
   * @returns Processed blueprint
   */
  async loadBlueprint(role: AgentRole, useCache: boolean = true): Promise<Blueprint> {
    // Return cached blueprint if available and requested
    const cacheKey = role.toString();
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    try {
      // Load blueprint file
      const blueprintPath = path.join(this.blueprintsPath, `${role.toLowerCase()}.md`);
      const content = await fs.readFile(blueprintPath, 'utf-8');
      
      // Parse blueprint sections
      const blueprint = this.parseBlueprint(content, role);
      
      // Cache the blueprint
      this.cache.set(cacheKey, blueprint);
      
      logger.info(`Loaded blueprint for role ${role}`);
      return blueprint;
    } catch (error) {
      logger.error(`Error loading blueprint for role ${role}:`, error);
      throw new Error(`Failed to load blueprint for role ${role}: ${error.message}`);
    }
  }
  
  /**
   * Parse a blueprint into sections
   * @param content Blueprint markdown content
   * @param role Agent role (for validation)
   * @returns Processed blueprint
   */
  private parseBlueprint(content: string, role: AgentRole): Blueprint {
    const sections = new Map<string, string>();
    let currentSection = '';
    let currentContent: string[] = [];
    let name = '';
    let parsedRole = role;
    let accessLevel: string[] = [];
    
    // Parse content line by line
    const lines = content.split('\n');
    for (const line of lines) {
      // Handle headers as section markers
      if (line.startsWith('## ')) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          sections.set(currentSection, currentContent.join('\n'));
        }
        
        // Start new section
        currentSection = line.substring(3).trim();
        currentContent = [];
      } else if (line.startsWith('# ')) {
        // Extract name from title
        const title = line.substring(2).trim();
        const nameMatch = title.match(/Warp Agent System - (.*) Blueprint/);
        if (nameMatch && nameMatch[1]) {
          name = nameMatch[1];
        }
      } else if (line.includes('- Agent Role:')) {
        // Validate role matches
        const roleLine = line.trim();
        const roleMatch = roleLine.match(/- Agent Role: (.*)/);
        if (roleMatch && roleMatch[1]) {
          const blueprintRole = roleMatch[1].trim();
          // Ensure the blueprint's role matches the expected role
          if (blueprintRole !== role.toString()) {
            logger.warn(`Blueprint role mismatch: expected ${role}, found ${blueprintRole}`);
          }
        }
      } else if (line.includes('- Access Level:')) {
        // Extract access level
        const accessLine = line.trim();
        const accessMatch = accessLine.match(/- Access Level: (.*)/);
        if (accessMatch && accessMatch[1]) {
          accessLevel = accessMatch[1].split(',').map(level => level.trim());
        }
      } else {
        // Add to current section
        currentContent.push(line);
      }
    }
    
    // Save the last section
    if (currentSection && currentContent.length > 0) {
      sections.set(currentSection, currentContent.join('\n'));
    }
    
    return {
      raw: content,
      sections,
      name,
      role: parsedRole,
      accessLevel
    };
  }
  
  /**
   * Get a specific section from a blueprint
   * @param blueprint Blueprint object
   * @param sectionName Section name
   * @returns Section content or undefined if not found
   */
  getSection(blueprint: Blueprint, sectionName: string): string | undefined {
    return blueprint.sections.get(sectionName);
  }
  
  /**
   * List all available blueprint files
   * @returns Array of blueprint files
   */
  async listBlueprints(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.blueprintsPath);
      return files
        .filter(file => file.endsWith('.md') && file !== 'base_blueprint.md')
        .map(file => file.replace('.md', ''));
    } catch (error) {
      logger.error('Error listing blueprints:', error);
      return [];
    }
  }
  
  /**
   * Customize a blueprint with specific values
   * @param blueprint Blueprint object
   * @param replacements Map of placeholder keys to replacement values
   * @returns Customized blueprint text
   */
  customizeBlueprint(blueprint: Blueprint, replacements: Map<string, string>): string {
    let customized = blueprint.raw;
    
    // Replace all placeholders
    for (const [key, value] of replacements.entries()) {
      const placeholder = `{{${key}}}`;
      // Use global replacement
      const regex = new RegExp(placeholder, 'g');
      customized = customized.replace(regex, value);
    }
    
    return customized;
  }
}

export default BlueprintLoader;
