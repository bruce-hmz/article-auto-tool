# WeChat Official Account Article Generation and Publishing System

A powerful automated workflow system for generating and publishing WeChat Official Account (公众号) articles using AI.

## Features

- **Complete Workflow**: 11-step process from topic selection to publishing
- **AI-Powered Content**: Uses Claude AI for content generation (brainstorming, outlining, drafting)
- **AI Image Generation**: Integrates with Volcano Engine for cover images and illustrations
- **Multi-Account Support**: Manage multiple WeChat Official Accounts
- **Flexible Workflow Modes**:
  - **Key Checkpoint Mode**: Pause at important decisions for user confirmation
  - **Auto Mode**: Fully automated execution
  - **Step-by-Step Mode**: Manual confirmation at every step
- **State Persistence**: Resume interrupted workflows from any step
- **CLI Interface**: Easy-to-use command-line tools
- **Claude Code Skill**: Can be triggered directly from Claude Code

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Volcano Engine (for image generation)
VOLCANO_API_KEY=your-volcano-api-key
VOLCANO_MODEL=doubao-seedream-4-5-251128

# WeChat Official Account
WECHAT_APP_ID_MUGGLES=wx your-app-id
WECHAT_APP_SECRET_MUGGLES=your-app-secret
```

### 3. Configure Account

Create an account configuration file:

```bash
cp config/accounts/muggles.json.example config/accounts/muggles.json
```

Edit `config/accounts/muggles.json` with your WeChat Official Account details.

### 4. Validate Configuration

```bash
bun run src/index.ts validate
```

### 5. Start Workflow

```bash
# Key checkpoint mode (recommended)
bun run src/index.ts start --mode key_checkpoint

# Auto mode (fully automated)
bun run src/index.ts start --mode auto

# Step-by-step mode
bun run src/index.ts start --mode step_by_step
```

## Workflow Steps

1. **Step 0**: Configuration Check - Verify environment and credentials
2. **Step 1**: Account Selection - Choose WeChat account to publish to
3. **Step 2**: Topic Brainstorming - Generate topic ideas with AI
4. **Step 3**: Research & Material Collection - Gather reference materials
5. **Step 4**: Generate Outline - Create article structure (Key Checkpoint)
6. **Step 5**: Write Draft - Generate article content (Key Checkpoint)
7. **Step 6**: Format Text - Apply Markdown formatting
8. **Step 7**: Generate Cover Image - Create article cover
9. **Step 8**: Generate Illustrations - Create article illustrations
10. **Step 9**: Preview Before Publishing - Review final article (Key Checkpoint)
11. **Step 10**: Publish to WeChat - Save to draft box (Key Checkpoint)

## CLI Commands

```bash
# Start a new workflow
bun run src/index.ts start --mode <mode> [--account <accountId>]

# Resume a paused workflow
bun run src/index.ts resume <workflowId>

# List all workflows
bun run src/index.ts status

# List configured accounts
bun run src/index.ts accounts

# Validate configuration
bun run src/index.ts validate
```

## Project Structure

```
/Users/a123456/wechat/auto-tool/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── core/                    # Core workflow engine
│   │   ├── workflow.ts          # Workflow orchestrator
│   │   ├── step-manager.ts      # Step management
│   │   └── state-manager.ts     # State persistence
│   ├── steps/                   # 11 workflow steps
│   ├── accounts/                # Account management
│   ├── generators/              # Content generators
│   ├── research/                # Research tools
│   ├── utils/                   # Utilities
│   └── types/                   # TypeScript types
├── config/                      # Configuration files
│   ├── accounts/                # Account configurations
│   ├── settings.json            # Global settings
│   └── workflow-modes.json      # Workflow mode definitions
├── output/                      # Generated articles
│   └── YYYY-MM-DD/topic-name/
├── skill/                       # Claude Code Skill
└── docs/                        # Documentation
```

## Output Files

Each workflow creates a dated directory with all generated files:

```
output/2026-02-26/topic-name/
├── 02-topics.json               # Generated topics
├── 03-research.json             # Research materials
├── 04-outline.json              # Article outline
├── 04-outline.md                # Outline in Markdown
├── 05-draft.md                  # Article draft
├── 06-formatted.md              # Formatted article
├── 09-preview.html              # HTML preview
└── images/
    ├── cover.png                # Cover image
    └── illustration-*.png       # Illustrations
```

## Configuration

### Workflow Modes

- **key_checkpoint**: Pauses at steps 4, 5, 9, and 10 for user confirmation (recommended)
- **auto**: Runs completely automated without pauses
- **step_by_step**: Pauses after every step

### Settings

Edit `config/settings.json` to customize:

- Claude model and parameters
- Image generation settings
- Default publishing options

## API Integration

### Claude API

Used for content generation:
- Topic brainstorming
- Outline creation
- Article writing

### Volcano Engine API

Used for image generation:
- Cover images
- Article illustrations

### WeChat API

Used for publishing:
- Image upload
- Draft creation

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Ensure all API keys are set in `.env`
   - Verify keys are valid and have sufficient credits

2. **Account Configuration Errors**
   - Check `config/accounts/` for valid JSON files
   - Ensure environment variables match `.env` file

3. **Workflow Failures**
   - Check `.workflow-states/` for detailed error logs
   - Use `resume` command to continue from failed step

### Debug Mode

Set log level in `config/settings.json`:

```json
{
  "logging": {
    "level": "debug"
  }
}
```

## License

MIT

## Support

For issues and feature requests, please create an issue in the repository.
