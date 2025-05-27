# VS Code Configuration

This directory contains VS Code specific configuration files for the Canabro project.

## MCP Configuration

The `mcp.json` file contains configuration for Model Context Protocol servers. This file may contain sensitive information like API keys and should not be committed to version control.

### Setup Instructions

1. Copy `mcp.template.json` to `mcp.json`
2. Replace all placeholder values (e.g., `${ANTHROPIC_API_KEY}`) with your actual API keys
3. Never commit the `mcp.json` file to version control (it's already in .gitignore)

You can either:
- Replace the placeholders with actual values (not recommended for security reasons)
- Use environment variables in your system and reference them in the configuration

For production environments, consider using a secure secret management system.
