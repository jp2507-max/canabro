# API Key Security Setup

## ⚠️ Important Security Notice

The extension configuration files in this directory may contain API keys and should NOT be committed to version control.

## 🔧 Setup Instructions

1. **Copy template files**: Copy `.template` files and remove the `.template` extension
2. **Add your API keys**: Replace placeholder values with your actual API keys  
3. **Keep secure**: These files are automatically gitignored

## 📋 Example Setup

```bash
# Copy the template
cp .gemini/extensions/taskmaster-ai/gemini-extension.json.template .gemini/extensions/taskmaster-ai/gemini-extension.json

# Edit and add your actual API keys
# Replace "YOUR_API_KEY_HERE" with real credentials
```

## 🔒 Security Best Practices

- ✅ Use template files as examples
- ✅ Keep real API keys in local config files only
- ✅ Never commit actual API keys to git
- ❌ Don't share config files with real keys
- ❌ Don't put API keys in code or documentation

## 🚫 Gitignored Files

The following patterns are automatically excluded from version control:
- `*.mcp.json` (except templates)
- `.vscode/settings.json`
- `.cursor/mcp.json`
- `.gemini/extensions/*/gemini-extension.json`

## 📝 Available Templates

- `taskmaster-ai/gemini-extension.json.template` - Task management with AI planning
- `brave-search/gemini-extension.json.template` - Web search capabilities
- Other extensions should follow the same pattern
