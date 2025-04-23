# Getting Started with Warp Agent System

This guide will help you set up and start using the Warp Agent System for AI-powered software development.

## Prerequisites

Before setting up the Warp Agent System, ensure you have the following:

1. **Runtime Environment**:
   - Python >= 3.10 or Node.js >= 18 (Node.js/TypeScript recommended)
   - Git

2. **Graph Database**:
   - Local installation of Dgraph or Neo4j

3. **LLM Environment**:
   - Claude Code CLI installed and configured
   - API key for Anthropic models (e.g., Claude 3.5 Sonnet, Haiku)

4. **Project Dependencies**:
   - Relevant language runtimes for your target project
   - Package managers (npm, pip)
   - Linters and test runners

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/juanbermudez/project-warpspeed.git
cd project-warpspeed
```

### 2. Install Dependencies

```bash
npm install
# or
pip install -r requirements.txt
```

### 3. Set Up Dgraph

Install Dgraph using Docker:

```bash
docker run --rm -it -p 8080:8080 -p 9080:9080 dgraph/standalone:latest
```

### 4. Configure the System

Create a configuration file `.warp-config.json`:

```json
{
  "project_root": "/path/to/your/project",
  "db": {
    "type": "dgraph",
    "address": "localhost:9080"
  },
  "claude_cli": {
    "path": "/path/to/claude",
    "api_key": "your-api-key"
  },
  "hitl": {
    "signal_directory": ".warp_hitl",
    "poll_interval_ms": 1000,
    "timeout_check_interval_ms": 5000
  }
}
```

### 5. Initialize the CKG

Run the schema initialization script:

```bash
node scripts/init-schema.js
```

### 6. Set Up HITL Directories

Create the necessary HITL directories:

```bash
mkdir -p .warp_hitl/pending .warp_hitl/signals .warp_hitl/processed
```

## Using the System

### 1. Start the MCP Server

```bash
npm start
# or
node src/index.js
```

### 2. Start the HITL CLI (in a separate terminal)

```bash
node src/hitl/cli.js
```

### 3. Create a Task

Create a task definition file `task.json`:

```json
{
  "title": "Add feature X",
  "description": "Implement feature X with the following requirements...",
  "priority": 1
}
```

Submit the task:

```bash
node scripts/submit-task.js --file task.json
```

### 4. Monitor the System

Watch the system logs to see the task being processed:

```bash
tail -f logs/system.log
```

Use the HITL CLI to respond to HITL requests:

```
> list
> show task_123
> approve task_123
```

### 5. Review Results

Once the task is complete, review the results in your project directory. The changes will have been applied according to the task specifications.

## Troubleshooting

### Common Issues

1. **Connection to Dgraph fails**:
   - Ensure Dgraph is running and the address in the configuration is correct
   - Check for firewall issues

2. **Claude CLI not found**:
   - Verify the path to Claude CLI in the configuration
   - Ensure the API key is valid

3. **HITL requests not appearing**:
   - Check the HITL signal directory permissions
   - Verify the path in the configuration

4. **Agents failing to spawn**:
   - Check Claude CLI logs for errors
   - Ensure sufficient system resources

## Next Steps

After setting up the system, you can:

1. Explore the sample Flask task to understand the workflow
2. Create your own tasks to test the system
3. Review the system testing plan for comprehensive validation
4. Explore the future roadmap for planned enhancements

For more information, refer to the detailed documentation on each component of the system.
