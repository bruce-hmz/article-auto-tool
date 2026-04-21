# WeChat Article Generator

This skill enables Claude Code to help you generate and publish WeChat Official Account articles through an automated workflow.

## When to Use

Use this skill when you want to:
- Generate and publish articles to WeChat Official Accounts
- Create content with AI assistance (brainstorming, outlining, drafting)
- Automate the article creation process from topic to publication
- Manage multiple WeChat accounts

## Prerequisites

Before using this skill, ensure:
1. The wechat-auto-tool project is set up (see docs/SETUP.md)
2. API keys are configured in `.env`:
   - `ANTHROPIC_API_KEY` for Claude
   - `VOLCANO_API_KEY` for image generation
   - WeChat Official Account credentials
3. Account configuration files exist in `config/accounts/`

## How to Trigger

You can invoke this skill by asking Claude to:
- "Generate a WeChat article"
- "Create content for my WeChat Official Account"
- "Run the article workflow"
- "Publish to WeChat"

Or by directly referencing:
- `/wechat-article`
- "Use the WeChat article generator"

## Workflow Overview

The system executes an 11-step workflow:

### Phase 1: Setup & Planning
1. **Config Check** - Verify environment and credentials
2. **Account Selection** - Choose target WeChat account
3. **Topic Brainstorming** - Generate topic ideas with AI
4. **Research** - Collect reference materials (optional)

### Phase 2: Content Creation
5. **Generate Outline** - Create article structure (⭐ Key Checkpoint)
6. **Write Draft** - Generate full article content (⭐ Key Checkpoint)
7. **Format Text** - Apply Markdown formatting

### Phase 3: Visual Content
8. **Generate Cover Image** - Create article cover
9. **Generate Illustrations** - Create inline images

### Phase 4: Publishing
10. **Preview** - Review final article (⭐ Key Checkpoint)
11. **Publish** - Save to WeChat draft box (⭐ Key Checkpoint)

## Workflow Modes

### Key Checkpoint Mode (Recommended)
- Pauses at steps 5, 6, 10, and 11 for user confirmation
- Best balance of automation and control
- Allows you to review and approve critical decisions

### Auto Mode
- Fully automated execution
- No user intervention required
- Best for batch processing or trusted workflows

### Step-by-Step Mode
- Pauses after every step
- Maximum control
- Best for debugging or learning the workflow

## Using the CLI

### Start a New Workflow

```bash
# Key checkpoint mode (recommended)
bun run src/index.ts start --mode key_checkpoint

# With specific account
bun run src/index.ts start --mode key_checkpoint --account muggles-school

# Auto mode
bun run src/index.ts start --mode auto
```

### Resume a Paused Workflow

```bash
# List workflows to get ID
bun run src/index.ts status

# Resume specific workflow
bun run src/index.ts resume <workflow-id>
```

### Other Commands

```bash
# Validate configuration
bun run src/index.ts validate

# List configured accounts
bun run src/index.ts accounts

# Show help
bun run src/index.ts --help
```

## Expected Interactions

When you use this skill, Claude will:

1. **Verify Setup**: Check that the project is properly configured
2. **Guide You**: Walk through each step with clear prompts
3. **Show Progress**: Display real-time progress and status
4. **Request Input**: Ask for decisions at key checkpoints
5. **Handle Errors**: Provide clear error messages and recovery options
6. **Save Outputs**: Store all generated files in dated output directories

## Example Usage

### Scenario 1: Generate Article from Scratch

```
User: "Generate a WeChat article about AI trends"

Claude: I'll help you create a WeChat article about AI trends. Let me start the workflow...

[Executes workflow with key_checkpoint mode]
- Step 0: Checking configuration... ✅
- Step 1: Selecting account... (prompts for selection)
- Step 2: Generating topic ideas... (shows 5 options)
- Step 3: Collecting research materials... (optional)
- Step 4: Creating outline... ⏸️  (pauses for approval)
- Step 5: Writing draft... ⏸️  (pauses for approval)
- ... and so on
```

### Scenario 2: Resume Interrupted Workflow

```
User: "I have a paused workflow, can you resume it?"

Claude: Let me check your workflow status...

[Runs: bun run src/index.ts status]

I found a paused workflow from today. Would you like to resume it?

User: "Yes"

Claude: Resuming workflow...
[Continues from where it left off]
```

## Output Files

Each workflow creates a timestamped directory:

```
output/2026-02-26/article-title/
├── 02-topics.json           # Generated topics
├── 03-research.json         # Research materials
├── 04-outline.json          # Outline data
├── 04-outline.md            # Human-readable outline
├── 05-draft.md              # Article draft
├── 06-formatted.md          # Formatted article
├── 09-preview.html          # HTML preview
└── images/
    ├── cover.png            # Cover image
    └── illustration-*.png   # Illustrations
```

## Configuration

### Environment Variables

Set these in `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
VOLCANO_API_KEY=...
WECHAT_APP_ID_MUGGLES=wx...
WECHAT_APP_SECRET_MUGGLES=...
```

### Account Configuration

Create files in `config/accounts/`:

```json
{
  "id": "account-id",
  "name": "Account Name",
  "appId": "${WECHAT_APP_ID_MUGGLES}",
  "appSecret": "${WECHAT_APP_SECRET_MUGGLES}",
  "config": {
    "defaultTheme": "elegant",
    "imageStyle": "modern-tech"
  }
}
```

## Troubleshooting

### Workflow Won't Start

1. Run validation: `bun run src/index.ts validate`
2. Check `.env` file exists and has all keys
3. Verify account configuration files

### Resume Fails

1. Check workflow ID is correct
2. Ensure workflow state file exists in `.workflow-states/`
3. Try starting a new workflow instead

### Publishing Fails

1. Verify WeChat credentials are correct
2. Check IP whitelist in WeChat settings
3. Ensure account is active and not suspended

## Best Practices

1. **Start with Key Checkpoint Mode** - Get familiar with the workflow before using auto mode
2. **Review at Checkpoints** - Take time to review outlines and drafts
3. **Provide Clear Topics** - Give specific, well-defined topics for better results
4. **Use Research** - Enable research step for more accurate, informed content
5. **Preview Before Publishing** - Always review the final article before publishing
6. **Backup Outputs** - Keep copies of generated articles in version control

## Advanced Usage

### Customizing Content Generation

Edit `config/settings.json` to adjust:
- Claude model parameters (temperature, max tokens)
- Image generation style
- Default author name

### Batch Processing

For multiple articles:
1. Use auto mode: `--mode auto`
2. Script multiple runs
3. Review outputs in batch later

### Integration with Other Tools

Output files are in standard formats:
- Markdown (`.md`)
- JSON (`.json`)
- HTML (`.html`)
- PNG images

Can be processed by other tools or CI/CD pipelines.

## Limitations

- Requires valid API keys and credits
- WeChat API has rate limits
- Image generation may take 10-30 seconds per image
- Quality depends on topic clarity and AI capabilities
- WeChat API requires IP whitelist

## Getting Help

1. Check the generated logs in `.workflow-states/`
2. Run validation command for diagnostics
3. Review README.md for detailed documentation
4. Check SETUP.md for configuration issues

## References

- [Workflow Guide](./references/workflow-guide.md) - Detailed workflow documentation
- [API Reference](./references/api-reference.md) - API integration details
- [README](../README.md) - Full project documentation
- [SETUP](../docs/SETUP.md) - Installation and configuration guide
