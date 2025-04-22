#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');

// Mock CKG storage path
const mockCkgStoragePath = path.join(projectRoot, '.warp_memory', 'mock_ckg');

// Ensure the mock CKG storage directory exists
fs.mkdirSync(mockCkgStoragePath, { recursive: true });

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node update-ckg-helper.js <update_type> <payload>');
  process.exit(1);
}

const updateType = args[0];
const payload = JSON.parse(args[1]);

// Execute the update
function executeUpdate(updateType, payload) {
  switch (updateType) {
    case 'createNode':
      return createNode(payload);
    case 'updateNodeProperties':
      return updateNodeProperties(payload);
    case 'createRelationship':
      return createRelationship(payload);
    case 'deleteNode':
      return deleteNode(payload);
    case 'deleteRelationship':
      return deleteRelationship(payload);
    default:
      throw new Error(`Unsupported update type: ${updateType}`);
  }
}

// Create a new node
function createNode(payload) {
  if (!payload.nodeType || !payload.nodeData) {
    throw new Error('nodeType and nodeData are required for createNode operation');
  }
  
  // Generate a unique ID for the node
  const nodeId = crypto.randomUUID();
  
  // Add ID to node data
  const nodeData = {
    id: nodeId,
    ...payload.nodeData,
    createdAt: new Date().toISOString()
  };
  
  // Create directory for node type if it doesn't exist
  const nodeTypeDir = path.join(mockCkgStoragePath, payload.nodeType);
  fs.mkdirSync(nodeTypeDir, { recursive: true });
  
  // Save node data to file
  const nodeFilePath = path.join(nodeTypeDir, `${nodeId}.json`);
  fs.writeFileSync(nodeFilePath, JSON.stringify(nodeData, null, 2));
  
  return { status: 'success', nodeId, message: `Created ${payload.nodeType} node with ID ${nodeId}` };
}

// Update node properties
function updateNodeProperties(payload) {
  if (!payload.nodeType || !payload.nodeId || !payload.nodeData) {
    throw new Error('nodeType, nodeId, and nodeData are required for updateNodeProperties operation');
  }
  
  // Check if node exists
  const nodeFilePath = path.join(mockCkgStoragePath, payload.nodeType, `${payload.nodeId}.json`);
  if (!fs.existsSync(nodeFilePath)) {
    throw new Error(`Node ${payload.nodeId} of type ${payload.nodeType} not found`);
  }
  
  // Read existing node data
  const nodeData = JSON.parse(fs.readFileSync(nodeFilePath, 'utf8'));
  
  // Update node data
  const updatedNodeData = {
    ...nodeData,
    ...payload.nodeData,
    updatedAt: new Date().toISOString()
  };
  
  // Save updated node data to file
  fs.writeFileSync(nodeFilePath, JSON.stringify(updatedNodeData, null, 2));
  
  return { status: 'success', nodeId: payload.nodeId, message: `Updated ${payload.nodeType} node ${payload.nodeId}` };
}

// Create a relationship between nodes
function createRelationship(payload) {
  if (!payload.nodeType || !payload.nodeId || !payload.targetNodeType || !payload.targetNodeId || !payload.relationshipType) {
    throw new Error('nodeType, nodeId, targetNodeType, targetNodeId, and relationshipType are required for createRelationship operation');
  }
  
  // Check if source node exists
  const sourceNodeFilePath = path.join(mockCkgStoragePath, payload.nodeType, `${payload.nodeId}.json`);
  if (!fs.existsSync(sourceNodeFilePath)) {
    throw new Error(`Source node ${payload.nodeId} of type ${payload.nodeType} not found`);
  }
  
  // Check if target node exists
  const targetNodeFilePath = path.join(mockCkgStoragePath, payload.targetNodeType, `${payload.targetNodeId}.json`);
  if (!fs.existsSync(targetNodeFilePath)) {
    throw new Error(`Target node ${payload.targetNodeId} of type ${payload.targetNodeType} not found`);
  }
  
  // Read source node data
  const sourceNodeData = JSON.parse(fs.readFileSync(sourceNodeFilePath, 'utf8'));
  
  // Initialize relationships array if it doesn't exist
  if (!sourceNodeData.relationships) {
    sourceNodeData.relationships = [];
  }
  
  // Check if relationship already exists
  const existingRelationship = sourceNodeData.relationships.find(rel => 
    rel.type === payload.relationshipType && rel.targetId === payload.targetNodeId
  );
  
  if (existingRelationship) {
    return { status: 'success', nodeId: payload.nodeId, message: `Relationship already exists` };
  }
  
  // Add relationship
  sourceNodeData.relationships.push({
    type: payload.relationshipType,
    targetType: payload.targetNodeType,
    targetId: payload.targetNodeId,
    createdAt: new Date().toISOString()
  });
  
  // Update updatedAt timestamp
  sourceNodeData.updatedAt = new Date().toISOString();
  
  // Save updated source node data to file
  fs.writeFileSync(sourceNodeFilePath, JSON.stringify(sourceNodeData, null, 2));
  
  return { status: 'success', nodeId: payload.nodeId, message: `Created relationship from ${payload.nodeType} ${payload.nodeId} to ${payload.targetNodeType} ${payload.targetNodeId}` };
}

// Delete a node
function deleteNode(payload) {
  if (!payload.nodeType || !payload.nodeId) {
    throw new Error('nodeType and nodeId are required for deleteNode operation');
  }
  
  // Check if node exists
  const nodeFilePath = path.join(mockCkgStoragePath, payload.nodeType, `${payload.nodeId}.json`);
  if (!fs.existsSync(nodeFilePath)) {
    throw new Error(`Node ${payload.nodeId} of type ${payload.nodeType} not found`);
  }
  
  // Delete node file
  fs.unlinkSync(nodeFilePath);
  
  // TODO: Delete relationships to this node from other nodes
  
  return { status: 'success', nodeId: payload.nodeId, message: `Deleted ${payload.nodeType} node ${payload.nodeId}` };
}

// Delete a relationship
function deleteRelationship(payload) {
  if (!payload.nodeType || !payload.nodeId || !payload.targetNodeId || !payload.relationshipType) {
    throw new Error('nodeType, nodeId, targetNodeId, and relationshipType are required for deleteRelationship operation');
  }
  
  // Check if source node exists
  const sourceNodeFilePath = path.join(mockCkgStoragePath, payload.nodeType, `${payload.nodeId}.json`);
  if (!fs.existsSync(sourceNodeFilePath)) {
    throw new Error(`Source node ${payload.nodeId} of type ${payload.nodeType} not found`);
  }
  
  // Read source node data
  const sourceNodeData = JSON.parse(fs.readFileSync(sourceNodeFilePath, 'utf8'));
  
  // Check if source node has relationships
  if (!sourceNodeData.relationships || !Array.isArray(sourceNodeData.relationships)) {
    return { status: 'success', nodeId: payload.nodeId, message: `No relationships found to delete` };
  }
  
  // Find the relationship to delete
  const relationshipIndex = sourceNodeData.relationships.findIndex(rel => 
    rel.type === payload.relationshipType && rel.targetId === payload.targetNodeId
  );
  
  if (relationshipIndex === -1) {
    return { status: 'success', nodeId: payload.nodeId, message: `Relationship not found` };
  }
  
  // Remove the relationship
  sourceNodeData.relationships.splice(relationshipIndex, 1);
  
  // Update updatedAt timestamp
  sourceNodeData.updatedAt = new Date().toISOString();
  
  // Save updated source node data to file
  fs.writeFileSync(sourceNodeFilePath, JSON.stringify(sourceNodeData, null, 2));
  
  return { status: 'success', nodeId: payload.nodeId, message: `Deleted relationship from ${payload.nodeType} ${payload.nodeId} to ${payload.targetNodeId}` };
}

// Execute the update and print the result
try {
  const result = executeUpdate(updateType, payload);
  console.log(JSON.stringify(result));
  process.exit(0);
} catch (error) {
  console.error('Error executing update:', error.message);
  console.log(JSON.stringify({ status: 'error', message: error.message }));
  process.exit(1);
}
