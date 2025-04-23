// src/config/supabase-auth-config.ts
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SupabaseAuthConfig {
  url: string;
  anonKey: string;
}

const defaultConfig: SupabaseAuthConfig = {
  url: '',
  anonKey: ''
};

export function loadSupabaseAuthConfig(): SupabaseAuthConfig {
  try {
    const configPath = path.join(process.cwd(), '.warp_memory', 'supabase-auth-config.json');
    const configData = readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.log('No Supabase auth configuration found. Please run setup.');
    return defaultConfig;
  }
}

export function saveSupabaseAuthConfig(config: SupabaseAuthConfig): void {
  try {
    const configPath = path.join(process.cwd(), '.warp_memory', 'supabase-auth-config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Supabase auth configuration saved.');
  } catch (error) {
    console.error('Failed to save Supabase auth configuration:', error);
  }
}

export function createSupabaseAuthClient() {
  const config = loadSupabaseAuthConfig();
  
  if (!config.url || !config.anonKey) {
    throw new Error('Supabase auth configuration is incomplete. Please run setup.');
  }
  
  return createClient(config.url, config.anonKey);
}
