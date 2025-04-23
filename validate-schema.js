// Simple Schema Validation Test
// This script checks if the Activity schema has been properly integrated

import fs from 'fs';
import path from 'path';

// Function to check if the schema includes Activity types
function checkSchema() {
  try {
    const schemaPath = path.resolve(process.cwd(), 'src', 'db', 'schema', 'schema.graphql');
    console.log(`Reading schema from ${schemaPath}...`);
    
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    const activityDef = schema.includes('type Activity implements Entity');
    const activityGroupDef = schema.includes('type ActivityGroup implements Entity');
    const fileChangeActivityDef = schema.includes('type FileChangeActivity implements Activity');
    const commentActivityDef = schema.includes('type CommentActivity implements Activity');
    const commandActivityDef = schema.includes('type CommandActivity implements Activity');
    const agentTransitionActivityDef = schema.includes('type AgentTransitionActivity implements Activity');
    
    console.log('Schema Integration Status:');
    console.log(`- Activity: ${activityDef ? '✅ Found' : '❌ Not Found'}`);
    console.log(`- ActivityGroup: ${activityGroupDef ? '✅ Found' : '❌ Not Found'}`);
    console.log(`- FileChangeActivity: ${fileChangeActivityDef ? '✅ Found' : '❌ Not Found'}`);
    console.log(`- CommentActivity: ${commentActivityDef ? '✅ Found' : '❌ Not Found'}`);
    console.log(`- CommandActivity: ${commandActivityDef ? '✅ Found' : '❌ Not Found'}`);
    console.log(`- AgentTransitionActivity: ${agentTransitionActivityDef ? '✅ Found' : '❌ Not Found'}`);
    
    if (activityDef && activityGroupDef && fileChangeActivityDef && 
        commentActivityDef && commandActivityDef && agentTransitionActivityDef) {
      console.log('✅ Schema integration is complete! All activity types found in the schema.');
    } else {
      console.log('❌ Schema integration is incomplete. Some activity types are missing.');
    }
    
    return { 
      activityDef, 
      activityGroupDef, 
      fileChangeActivityDef, 
      commentActivityDef, 
      commandActivityDef, 
      agentTransitionActivityDef 
    };
  } catch (error) {
    console.error('Error reading or parsing schema:', error);
    return null;
  }
}

// Function to check if query_ckg.ts includes Activity types
function checkQueryCkg() {
  try {
    const queryCkgPath = path.resolve(process.cwd(), 'src', 'tools', 'query_ckg.ts');
    console.log(`\nReading query_ckg.ts from ${queryCkgPath}...`);
    
    const queryCkgContent = fs.readFileSync(queryCkgPath, 'utf-8');
    
    const hasActivityInNodeTypes = queryCkgContent.includes("'Activity'");
    
    console.log('query_ckg.ts Integration Status:');
    console.log(`- Activity in nodeType enum: ${hasActivityInNodeTypes ? '✅ Found' : '❌ Not Found'}`);
    
    return { hasActivityInNodeTypes };
  } catch (error) {
    console.error('Error reading or parsing query_ckg.ts:', error);
    return null;
  }
}

// Function to check if update_ckg.ts includes Activity types
function checkUpdateCkg() {
  try {
    const updateCkgPath = path.resolve(process.cwd(), 'src', 'tools', 'update_ckg.ts');
    console.log(`\nReading update_ckg.ts from ${updateCkgPath}...`);
    
    const updateCkgContent = fs.readFileSync(updateCkgPath, 'utf-8');
    
    const hasActivityInNodeTypes = updateCkgContent.includes("'Activity'");
    
    console.log('update_ckg.ts Integration Status:');
    console.log(`- Activity in nodeType enum: ${hasActivityInNodeTypes ? '✅ Found' : '❌ Not Found'}`);
    
    return { hasActivityInNodeTypes };
  } catch (error) {
    console.error('Error reading or parsing update_ckg.ts:', error);
    return null;
  }
}

// Run the tests
console.log('======================================');
console.log('CKG Activity Schema Integration Check');
console.log('======================================\n');

const schemaResult = checkSchema();
const queryCkgResult = checkQueryCkg();
const updateCkgResult = checkUpdateCkg();

if (schemaResult && queryCkgResult && updateCkgResult) {
  console.log('\n======================================');
  if (schemaResult.activityDef && queryCkgResult.hasActivityInNodeTypes && updateCkgResult.hasActivityInNodeTypes) {
    console.log('✅ CKG Activity Schema Integration is COMPLETE!');
    console.log('You can now use the ActivityTrackerCKG class to track activities in the CKG.');
  } else {
    console.log('❌ CKG Activity Schema Integration is INCOMPLETE!');
    console.log('Please fix the issues above before using the ActivityTrackerCKG class.');
  }
  console.log('======================================');
}
