#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');

// Mock CKG storage path
const mockCkgStoragePath = path.join(projectRoot, '.warp_memory', 'mock_ckg');

// Ensure the mock CKG storage directory exists
fs.mkdirSync(mockCkgStoragePath, { recursive: true });

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node query-ckg-helper.js <query_type> <payload>');
  process.exit(1);
}

const queryType = args[0];
const payload = JSON.parse(args[1]);

// Execute the query
function executeQuery(queryType, payload) {
  switch (queryType) {
    case 'getNodeById':
      return getNodeById(payload);
    case 'findNodesByLabel':
      return findNodesByLabel(payload);
    case 'findRelatedNodes':
      return findRelatedNodes(payload);
    case 'keywordSearch':
      return keywordSearch(payload);
    case 'vectorSearch':
      return vectorSearch(payload);
    default:
      throw new Error(`Unsupported query type: ${queryType}`);
  }
}

// Get a node by ID
function getNodeById(payload) {
  if (!payload.nodeType || !payload.parameters?.id) {
    throw new Error('nodeType and id are required for getNodeById operation');
  }
  
  // Check if node exists
  const nodeFilePath = path.join(mockCkgStoragePath, payload.nodeType, `${payload.parameters.id}.json`);
  if (!fs.existsSync(nodeFilePath)) {
    return { results: [] };
  }
  
  // Read node data
  const nodeData = JSON.parse(fs.readFileSync(nodeFilePath, 'utf8'));
  
  return { results: [nodeData] };
}

// Find nodes by label (name)
function findNodesByLabel(payload) {
  if (!payload.nodeType || !payload.parameters?.label) {
    throw new Error('nodeType and label are required for findNodesByLabel operation');
  }
  
  // Check if node type directory exists
  const nodeTypeDir = path.join(mockCkgStoragePath, payload.nodeType);
  if (!fs.existsSync(nodeTypeDir)) {
    return { results: [] };
  }
  
  // Get all node files
  const nodeFiles = fs.readdirSync(nodeTypeDir).filter(file => file.endsWith('.json'));
  
  // Read and filter nodes by label
  const matchingNodes = [];
  const label = payload.parameters.label.toLowerCase();
  
  for (const nodeFile of nodeFiles) {
    const nodeFilePath = path.join(nodeTypeDir, nodeFile);
    const nodeData = JSON.parse(fs.readFileSync(nodeFilePath, 'utf8'));
    
    // Check if the node has a name or title property that matches the label
    if (
      (nodeData.name && nodeData.name.toLowerCase().includes(label)) ||
      (nodeData.title && nodeData.title.toLowerCase().includes(label))
    ) {
      matchingNodes.push(nodeData);
    }
  }
  
  // Apply limit if specified
  if (payload.parameters?.limit && matchingNodes.length > payload.parameters.limit) {
    matchingNodes.length = payload.parameters.limit;
  }
  
  return { results: matchingNodes };
}

// Find nodes related to a given node
function findRelatedNodes(payload) {
  if (!payloa