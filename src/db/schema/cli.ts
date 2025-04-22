#!/usr/bin/env node
// src/db/schema/cli.ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import fs from 'fs';
import { initSchema } from './init-schema';
import { initSchemaAndGenerateZod, updateZodSchemasOnly } from './init-wrapper';
import { checkSchema, getCurrentSchema } from './schema-utils';
import { createDgraphClient } from '../dgraph';
import { logger } from '../../utils/logger';
import { config } from '../../config';

// Configure yargs command-line interface
yargs(hideBin(process.argv))
  .command(
    'init',
    'Initialize the Dgraph schema',
    (yargs) => {
      return yargs
        .option('schema-path', {
          alias: 's',
          type: 'string',
          description: 'Path to the GraphQL schema file',
          default: path.join(__dirname, 'schema.graphql'),
        })
        .option('dgraph-address', {
          alias: 'd',
          type: 'string',
          description: 'Dgraph server address',
          default: config.dgraph.address,
        })
        .option('drop-all', {
          alias: 'f',
          type: 'boolean',
          description: 'Drop all data before initializing schema',
          default: false,
        })
        .option('log-level', {
          alias: 'l',
          type: 'string',
          choices: ['error', 'warn', 'info', 'debug'],
          description: 'Log level for the operation',
          default: 'info',
        })
        .option('generate-zod', {
          alias: 'z',
          type: 'boolean',
          description: 'Generate Zod schemas from GraphQL schema',
          default: true,
        })
        .option('zod-output', {
          alias: 'o',
          type: 'string',
          description: 'Output path for generated Zod schemas',
          default: path.join(__dirname, '..', '..', 'types', 'generated', 'ckg-schema.ts'),
        });
    },
    async (argv) => {
      try {
        // Ensure the schema file exists
        if (!fs.existsSync(argv.schemaPath)) {
          logger.error('Schema file not found', { schemaPath: argv.schemaPath });
          process.exit(1);
        }

        // Initialize the schema and generate Zod schemas
        await initSchemaAndGenerateZod({
          schemaPath: argv.schemaPath,
          dgraphAddress: argv.dgraphAddress,
          dropAll: argv.dropAll,
          logLevel: argv.logLevel as any,
          generateZod: argv.generateZod,
          zodOutputPath: argv.zodOutput
        });

        logger.info('Schema initialization and Zod generation completed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Schema initialization failed', { error });
        process.exit(1);
      }
    }
  )
  .command(
    'check',
    'Check if the schema needs to be updated',
    (yargs) => {
      return yargs
        .option('schema-path', {
          alias: 's',
          type: 'string',
          description: 'Path to the GraphQL schema file',
          default: path.join(__dirname, 'schema.graphql'),
        })
        .option('dgraph-address', {
          alias: 'd',
          type: 'string',
          description: 'Dgraph server address',
          default: config.dgraph.address,
        })
        .option('log-level', {
          alias: 'l',
          type: 'string',
          choices: ['error', 'warn', 'info', 'debug'],
          description: 'Log level for the operation',
          default: 'info',
        });
    },
    async (argv) => {
      try {
        // Set log level
        logger.level = argv.logLevel as any;

        // Ensure the schema file exists
        if (!fs.existsSync(argv.schemaPath)) {
          logger.error('Schema file not found', { schemaPath: argv.schemaPath });
          process.exit(1);
        }

        // Create Dgraph client
        const client = createDgraphClient(argv.dgraphAddress);

        // Check the schema
        const result = await checkSchema(client, argv.schemaPath);

        if (!result.exists) {
          logger.info('Schema does not exist in the database');
          process.exit(2);
        } else if (result.needsUpdate) {
          logger.info('Schema needs to be updated', {
            differences: result.differences
          });
          process.exit(3);
        } else {
          logger.info('Schema is up to date');
          process.exit(0);
        }
      } catch (error) {
        logger.error('Schema check failed', { error });
        process.exit(1);
      }
    }
  )
  .command(
    'export',
    'Export the current schema from Dgraph',
    (yargs) => {
      return yargs
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output file path',
          default: 'exported-schema.graphql',
        })
        .option('dgraph-address', {
          alias: 'd',
          type: 'string',
          description: 'Dgraph server address',
          default: config.dgraph.address,
        })
        .option('log-level', {
          alias: 'l',
          type: 'string',
          choices: ['error', 'warn', 'info', 'debug'],
          description: 'Log level for the operation',
          default: 'info',
        });
    },
    async (argv) => {
      try {
        // Set log level
        logger.level = argv.logLevel as any;

        // Create Dgraph client
        const client = createDgraphClient(argv.dgraphAddress);

        // Get the current schema
        const schema = await getCurrentSchema(client);

        if (!schema) {
          logger.error('No schema found in the database');
          process.exit(1);
        }

        // Write the schema to the output file
        fs.writeFileSync(argv.output, schema, 'utf8');
        logger.info('Schema exported successfully', { output: argv.output });
        process.exit(0);
      } catch (error) {
        logger.error('Schema export failed', { error });
        process.exit(1);
      }
    }
  )
  .command(
    'generate-zod',
    'Generate Zod schemas from GraphQL schema without modifying Dgraph',
    (yargs) => {
      return yargs
        .option('schema-path', {
          alias: 's',
          type: 'string',
          description: 'Path to the GraphQL schema file',
          default: path.join(__dirname, 'schema.graphql'),
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output path for generated Zod schemas',
          default: path.join(__dirname, '..', '..', 'types', 'generated', 'ckg-schema.ts'),
        })
        .option('log-level', {
          alias: 'l',
          type: 'string',
          choices: ['error', 'warn', 'info', 'debug'],
          description: 'Log level for the operation',
          default: 'info',
        });
    },
    async (argv) => {
      try {
        // Set log level
        logger.level = argv.logLevel as any;

        // Ensure the schema file exists
        if (!fs.existsSync(argv.schemaPath)) {
          logger.error('Schema file not found', { schemaPath: argv.schemaPath });
          process.exit(1);
        }

        // Generate Zod schemas only
        await updateZodSchemasOnly(argv.schemaPath, argv.output);
        
        logger.info('Zod schemas generated successfully', { 
          schemaPath: argv.schemaPath,
          output: argv.output
        });
        process.exit(0);
      } catch (error) {
        logger.error('Zod schema generation failed', { error });
        process.exit(1);
      }
    }
  )
  .demandCommand(1, 'You must specify a command')
  .strict()
  .help()
  .parse();