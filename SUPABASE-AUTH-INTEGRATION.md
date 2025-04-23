# Supabase Authentication Integration for Warp Agent System

## Overview

This document describes the implementation of Supabase authentication in the Warp Agent System. The integration enables secure access to the FASTMCP server and its APIs using Supabase's authentication service.

## Implementation Details

### Files Created/Modified

1. **Configuration**
   - `src/config/supabase-auth-config.ts`: Manages Supabase authentication configuration.

2. **Services**
   - `src/services/auth-service.ts`: Provides authentication functionality (sign-up, sign-in, token validation).

3. **Middleware**
   - `src/middleware/auth-middleware.ts`: Protects API routes by validating authentication tokens.

4. **Server**
   - `src/mcp-server-enhanced.ts`: FASTMCP server with Supabase authentication integration.
   - `src/index.ts` (modified): Updated to include MCP server startup.

5. **Setup**
   - `src/scripts/setup-supabase-auth.ts`: Script to configure Supabase authentication.
   - `run-mcp-server.sh`: Helper script to start the MCP server.

### Authentication Flow

1. **User Registration**: `/api/auth/register` endpoint allows new users to register with email/password.
2. **Authentication**: `/api/auth/login` endpoint validates credentials and returns an access token.
3. **Secure Access**: Protected endpoints use the auth middleware to validate JWT tokens.
4. **Logout**: `/api/auth/logout` endpoint for terminating sessions.

### Configuration

The Supabase authentication configuration is stored in `.warp_memory/supabase-auth-config.json` with the following structure:

```json
{
  "url": "https://your-supabase-project-url.supabase.co",
  "anonKey": "your-supabase-anon-key"
}
```

## How to Use

### Setup Supabase Authentication

1. Create a Supabase project at [https://app.supabase.io](https://app.supabase.io)
2. Run the setup script:
   ```bash
   npm run setup:auth
   ```
3. Enter your Supabase project URL and anon key when prompted.

### Start the MCP Server

```bash
./run-mcp-server.sh
```

### API Endpoints

#### Public Endpoints

- `GET /health`: Health check endpoint
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Authenticate and get access token
- `POST /api/auth/logout`: End the current session

#### Protected Endpoints

- `POST /api/query-ckg`: Query the Code Knowledge Graph
- `POST /api/update-ckg`: Update the Code Knowledge Graph

## Next Steps

1. **Enhanced Authorization**: Implement role-based access control for different agent types.
2. **Token Refresh**: Add token refresh mechanism for long-running sessions.
3. **Multi-factor Authentication**: Implement MFA for enhanced security.
4. **User Management**: Add user management capabilities (password reset, profile update).
