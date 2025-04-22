# Warp Agent System: MVP Proof of Concept

## Overview

The Warp Agent System is a multi-agent AI system designed to accelerate high-quality software development by integrating AI deeply into structured, proven workflows. The system leverages precise context from a unified knowledge base (Code Knowledge Graph/Memory Bank) and ensures human oversight at critical junctures.

This repository contains the implementation of the Warp MVP Proof of Concept as defined in the PRD.

## Getting Started

### Prerequisites

- Node.js >= 18
- Dgraph database (local installation)
- Git

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd warp-agent-system
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Initialize the Dgraph schema:
   ```
   npm run schema:init
   ```

## Project Structure

- `src/`: Source code directory
  - `config.ts`: Configuration settings
  - `index.ts`: Application entry point
  - `db/`: Database-related code
    - `dgraph.ts`: Dgraph client
    - `schema/`: Schema definition and management
      - `schema.graphql`: GraphQL schema definition
      - `cli.ts`: CLI for schema operations
      - `init-schema.ts`: Schema initialization script
      - `generate-zod-schemas.ts`: Zod schema generator
  - `tools/`: MCP tools implementation
    - `query_ckg.ts`: CKG query tool
    - `update_ckg.ts`: CKG update tool
    - `initialize_schema.ts`: Schema initialization tool
  - `types/`: TypeScript type definitions
    - `generated/`: Auto-generated type definitions
      - `ckg-schema.ts`: Generated Zod schemas
  - `utils/`: Utility functions
    - `logger.ts`: Logging utility

## Available Scripts

- `npm run build`: Build the TypeScript project
- `npm run start`: Start the application
- `npm run dev`: Run the application in development mode
- `npm run test`: Run tests
- `npm run schema:init`: Initialize the Dgraph schema with Zod generation
- `npm run schema:check`: Check the schema status
- `npm run schema:export`: Export the schema to a file
- `npm run schema:generate-zod`: Generate Zod schemas from GraphQL
- `npm run schema:init-no-zod`: Initialize the schema without Zod generation
- `npm run schema:check-sync`: Check if GraphQL and Zod schemas are in sync

## Core Features

### CKG Schema

The Code Knowledge Graph (CKG) schema defines the structure of the knowledge base that agents use to share information. The schema includes:

- Core entity types (Project, Task, SubTask, File, Function, etc.)
- Relationship types (HAS_TASK, DECOMPOSED_INTO, DEPENDS_ON, etc.)
- Status enumerations and property definitions
- Indexing for efficient querying

### MCP Tools

The Model Context Protocol (MCP) tools provide a standardized interface for Claude Code CLI to interact with the system:

- `query_ckg`: Query the Code Knowledge Graph
- `update_ckg`: Update the Code Knowledge Graph
- `initialize_schema`: Initialize the Dgraph schema

### Agent Configuration

The system includes detailed configuration templates for each agent role:

- Orchestrator: Central coordinator
- Product Lead: Requirements and high-level planning
- Design Engineer: UI/UX specifications
- Frontend Engineer: Frontend implementation
- Backend Engineer: Backend implementation
- QA Tester: Testing and quality assurance

## References

- See `warp-prd-project-plan.md` for the full Product Requirements Document
- See `CKG-SCHEMA-README.md` for details on the schema implementation
