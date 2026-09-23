# Build your own MCP server (template)

Generated layout for a Platform 3.0 MCP server. Skill id: **`fw-build-your-mcp-server`**.

A Freshworks marketplace app that provides an MCP server for external API integration.

## Features

- **Get Resource** - Retrieve resource details by ID
- **Create Resource** - Create new resources in the external system
- **Bearer Token Authentication** - Secure API authentication

## Setup

1. Install the app in your Freshworks product
2. Configure credentials in app settings:
   - API Key
   - API Base URL (e.g., api.example.com)

## Tools

- `getResource` - Retrieve a resource by ID
- `createResource` - Create a new resource

## Testing

```bash
cd <app-directory>
fdk run
```

Configure locally: http://localhost:10001/custom_configs
Execute locally: https://localhost:10001/web/test — select type "actions", then test each action.
