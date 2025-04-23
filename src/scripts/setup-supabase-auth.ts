// src/scripts/setup-supabase-auth.ts
import { saveSupabaseAuthConfig } from '../config/supabase-auth-config.js';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupSupabaseAuth() {
  logger.info('Setting up Supabase Auth for Warp Agent System');
  console.log('Please provide your Supabase project information:');
  
  const url = await askQuestion('Supabase URL: ');
  const anonKey = await askQuestion('Supabase Anon Key: ');
  
  // Validate the credentials by creating a test client
  try {
    logger.info('Validating Supabase credentials...');
    const supabase = createClient(url, anonKey);
    const { error } = await supabase.auth.getSession();
    
    if (error) {
      logger.error('Error validating Supabase credentials', { error: error.message });
      console.error('Error validating Supabase credentials:', error.message);
      console.log('Please check your URL and Anon Key and try again.');
      rl.close();
      return;
    }
    
    const config = { url, anonKey };
    saveSupabaseAuthConfig(config);
    
    logger.info('Supabase Auth configuration saved successfully');
    console.log('Supabase Auth configuration saved successfully!');
    console.log('You can now use Supabase Auth with your Warp Agent System.');
  } catch (error) {
    logger.error('Error setting up Supabase Auth', { error });
    console.error('Error setting up Supabase Auth:', error);
    console.log('Please try again with valid credentials.');
  } finally {
    rl.close();
  }
}

setupSupabaseAuth().catch(error => {
  logger.error('Unhandled error in Supabase Auth setup', { error });
  console.error('Error:', error);
  process.exit(1);
});
