# Setup Guide

This guide will walk you through setting up the WeChat Official Account Article Generation and Publishing System.

## Prerequisites

- **Bun Runtime**: Install from https://bun.sh
- **Anthropic API Key**: Get from https://console.anthropic.com
- **Volcano Engine API Key**: Get from https://www.volcengine.com
- **WeChat Official Account**: Registered at https://mp.weixin.qq.com

## Installation Steps

### 1. Install Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

### 2. Clone/Download Project

```bash
cd /Users/a123456/wechat/auto-tool
```

### 3. Install Dependencies

```bash
bun install
```

This will install all required dependencies:
- @anthropic-ai/sdk
- @inquirer/prompts
- commander
- axios
- dotenv
- chalk
- ora
- date-fns
- uuid
- zod

### 4. Configure Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```bash
# Claude API Configuration
# Get your key from: https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Volcano Engine API Configuration
# Get your key from: https://www.volcengine.com
VOLCANO_API_KEY=your-volcano-api-key
VOLCANO_MODEL=doubao-seedream-4-5-251128

# WeChat Official Account Configuration
# Get these from: https://mp.weixin.qq.com -> Settings -> Development
WECHAT_APP_ID_MUGGLES=wx1234567890abcdef
WECHAT_APP_SECRET_MUGGLES=your-app-secret-here
```

### 5. Configure WeChat Account

Create account configuration:

```bash
cp config/accounts/muggles.json.example config/accounts/muggles.json
```

Edit `config/accounts/muggles.json`:

```json
{
  "id": "muggles-school",
  "name": "麻瓜补习社",
  "appId": "${WECHAT_APP_ID_MUGGLES}",
  "appSecret": "${WECHAT_APP_SECRET_MUGGLES}",
  "config": {
    "defaultTheme": "elegant",
    "imageStyle": "modern-tech",
    "publishing": {
      "defaultAuthor": "Claude AI",
      "autoPublish": false
    }
  }
}
```

**Important Notes:**
- `appId` and `appSecret` use environment variable references
- Don't hardcode credentials in the JSON file
- Each account needs a unique ID

### 6. Configure Multiple Accounts (Optional)

You can configure multiple WeChat accounts:

```bash
# Add environment variables for second account
WECHAT_APP_ID_ACCOUNT2=wx...
WECHAT_APP_SECRET_ACCOUNT2=...

# Create configuration file
cp config/accounts/muggles.json.example config/accounts/account2.json
```

Edit `config/accounts/account2.json`:

```json
{
  "id": "account2",
  "name": "Second Account Name",
  "appId": "${WECHAT_APP_ID_ACCOUNT2}",
  "appSecret": "${WECHAT_APP_SECRET_ACCOUNT2}",
  "config": {
    "defaultTheme": "professional",
    "imageStyle": "corporate"
  }
}
```

### 7. Verify Configuration

Run the validation command:

```bash
bun run src/index.ts validate
```

Expected output:

```
🔍 Validating Configuration

Environment Variables:
  ANTHROPIC_API_KEY: ✅ Set
  VOLCANO_API_KEY: ✅ Set

Accounts:
  ✅ Valid - 麻瓜补习社 (muggles-school)

Directories:
  config/accounts/: ✅ Exists
  output/: ⚠️  Will be created

✅ Validation complete
```

### 8. Test Workflow

Run your first workflow:

```bash
bun run src/index.ts start --mode key_checkpoint
```

The system will:
1. Verify configuration
2. Prompt for account selection
3. Generate topic ideas
4. Guide you through the workflow
5. Save article to WeChat draft box

## Getting API Keys

### Anthropic API Key

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

### Volcano Engine API Key

1. Go to https://www.volcengine.com
2. Sign up or log in
3. Navigate to Console -> API Management
4. Create new API credentials
5. Enable image generation service
6. Copy the API key to your `.env` file

### WeChat Official Account Credentials

1. Go to https://mp.weixin.qq.com
2. Log in to your Official Account
3. Go to Settings (设置) -> Basic Configuration (基本配置)
4. Copy AppID and AppSecret
5. Add IP whitelist if required (your server IP)
6. Paste credentials in `.env` file

**Important:** WeChat API has IP whitelist restrictions. Make sure your IP is whitelisted in the WeChat Official Account settings.

## Configuration Reference

### Environment Variables (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for content generation |
| `VOLCANO_API_KEY` | Yes | Volcano Engine API key for image generation |
| `VOLCANO_MODEL` | No | Image generation model (default: doubao-seedream-4-5-251128) |
| `WECHAT_APP_ID_*` | Yes | WeChat Official Account AppID |
| `WECHAT_APP_SECRET_*` | Yes | WeChat Official Account AppSecret |

### Account Configuration (config/accounts/*.json)

```json
{
  "id": "unique-account-id",
  "name": "Account Display Name",
  "appId": "${ENV_VAR_NAME}",
  "appSecret": "${ENV_VAR_NAME}",
  "config": {
    "defaultTheme": "elegant",
    "imageStyle": "modern-tech",
    "publishing": {
      "defaultAuthor": "Author Name",
      "autoPublish": false
    }
  }
}
```

### Global Settings (config/settings.json)

```json
{
  "defaultMode": "key_checkpoint",
  "outputDir": "output",
  "stateDir": ".workflow-states",
  "logging": {
    "level": "info",
    "file": "logs/workflow.log"
  },
  "claude": {
    "model": "claude-sonnet-4-6",
    "maxTokens": 4096,
    "temperature": 0.7
  },
  "imageGeneration": {
    "provider": "volcano",
    "model": "doubao-seedream-4-5-251128",
    "defaultStyle": "modern-tech",
    "coverImageRatio": "2.35:1",
    "illustrationRatio": "16:9"
  },
  "publishing": {
    "autoPublish": false,
    "defaultAuthor": "Claude AI"
  }
}
```

## Testing the Setup

### 1. Test Configuration

```bash
bun run src/index.ts validate
```

### 2. Test Account List

```bash
bun run src/index.ts accounts
```

### 3. Run a Test Workflow

```bash
bun run src/index.ts start --mode key_checkpoint
```

Follow the prompts to generate a test article.

## Troubleshooting Setup Issues

### "API key not found"

- Check `.env` file exists
- Verify environment variable names match
- Restart terminal/IDE after creating `.env`

### "Account not found"

- Check `config/accounts/*.json` files exist
- Verify JSON syntax is valid
- Check environment variable references

### "WeChat API connection failed"

- Verify AppID and AppSecret are correct
- Check IP whitelist in WeChat settings
- Ensure account is not suspended

### "Permission denied"

```bash
chmod +x src/index.ts
```

### "Module not found"

```bash
bun install
```

## Next Steps

After successful setup:

1. Read [README.md](../README.md) for usage instructions
2. Try the key_checkpoint mode for your first article
3. Review generated files in `output/` directory
4. Customize settings in `config/settings.json`

## Getting Help

- Check the [README.md](../README.md) for detailed documentation
- Review error logs in `.workflow-states/`
- Ensure all API credentials are valid
- Try the validate command for diagnostics
