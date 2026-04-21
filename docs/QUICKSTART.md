# Quick Start Guide

Get up and running with the WeChat Article Generator in 5 minutes.

## Prerequisites Check

Make sure you have:
- ✅ Node.js 18+ or Bun installed
- ✅ Anthropic API key
- ✅ Volcano Engine API key
- ✅ WeChat Official Account credentials

## Installation

```bash
# Install dependencies
npm install

# Or with Bun (faster)
bun install
```

## Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Edit `.env` File

Add your API keys:

```bash
# Claude API (Required)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Volcano Engine (Required for images)
VOLCANO_API_KEY=your-volcano-key

# WeChat Account 1
WECHAT_APP_ID_MUGGLES=wx your-app-id
WECHAT_APP_SECRET_MUGGLES=your-app-secret
```

### 3. Configure Account

```bash
cp config/accounts/muggles.json.example config/accounts/muggles.json
```

The account file should look like:

```json
{
  "id": "muggles-school",
  "name": "麻瓜补习社",
  "appId": "${WECHAT_APP_ID_MUGGLES}",
  "appSecret": "${WECHAT_APP_SECRET_MUGGLES}",
  "config": {
    "defaultTheme": "elegant",
    "imageStyle": "modern-tech"
  }
}
```

## Validate Setup

```bash
npm run validate
```

Expected output:

```
🔍 Validating Configuration

Environment Variables:
  ANTHROPIC_API_KEY: ✅ Set
  VOLCANO_API_KEY: ✅ Set

Accounts:
  ✅ Valid - 麻瓜补习社 (muggles-school)

✅ Validation complete
```

## Run Your First Workflow

### Key Checkpoint Mode (Recommended)

```bash
npm start
```

This will:
1. ✅ Check configuration
2. 🔍 Ask you to select an account
3. 💡 Generate topic ideas
4. 📚 Optionally collect research
5. 📝 Create an outline (pauses for approval)
6. ✍️ Write the article (pauses for approval)
7. 🎨 Format the text
8. 🖼️ Generate cover image
9. 🎨 Generate illustrations
10. 👀 Show preview (pauses for approval)
11. 📤 Publish to WeChat draft box (pauses for approval)

### Auto Mode

```bash
npm start -- --mode auto
```

Runs completely automated (not recommended for first run).

### Step-by-Step Mode

```bash
npm start -- --mode step_by_step
```

Pauses after every step for maximum control.

## What to Expect

### Duration
- Total time: 3-6 minutes
- Content generation: 1-2 minutes
- Image generation: 1-3 minutes
- Publishing: 30 seconds

### User Input Required (Key Checkpoint Mode)

1. **Account Selection**: Choose which WeChat account to use
2. **Topic Direction**: Enter a theme or keyword (optional)
3. **Topic Selection**: Choose from generated ideas or enter custom
4. **Research**: Decide whether to search for references
5. **Outline Approval**: Review and approve the outline
6. **Draft Approval**: Review and approve the article
7. **Final Approval**: Confirm before publishing

### Output Files

All files are saved to:

```
output/YYYY-MM-DD/topic-name/
├── 02-topics.json         # Topic ideas
├── 03-research.json       # Research materials
├── 04-outline.json        # Outline data
├── 04-outline.md          # Readable outline
├── 05-draft.md            # Article draft
├── 06-formatted.md        # Final formatted article
├── 09-preview.html        # HTML preview
└── images/
    ├── cover.png          # Cover image
    └── illustration-*.png # Illustrations
```

## Resume Interrupted Workflow

If the workflow is interrupted:

```bash
# List workflows
npm start -- status

# Resume specific workflow
npm start -- resume <workflow-id>
```

## Troubleshooting

### "API key not found"

- Check `.env` file exists
- Verify variable names match exactly
- Restart terminal after creating `.env`

### "Account validation failed"

- Check `config/accounts/*.json` exists
- Verify JSON syntax is valid
- Ensure environment variable references are correct

### "WeChat API connection failed"

- Verify AppID and AppSecret are correct
- Check IP whitelist in WeChat settings
- Ensure account is active

### "Image generation failed"

- Check Volcano API key is valid
- Verify you have sufficient credits
- Try with different topic

## Next Steps

1. ✅ Run validation to verify setup
2. 🚀 Start your first workflow
3. 📝 Review generated content
4. 🎨 Check generated images
5. 📤 Verify draft in WeChat
6. 🎉 Celebrate your first AI-generated article!

## Tips for Best Results

1. **Be Specific**: Provide clear, specific topics
2. **Use Research**: Enable research for more accurate content
3. **Review Carefully**: Check outlines and drafts at checkpoints
4. **Iterate**: Don't hesitate to regenerate if not satisfied
5. **Customize**: Edit prompts and settings for your style

## Common Commands

```bash
# Validate configuration
npm run validate

# List accounts
npm start -- accounts

# List workflows
npm start -- status

# Start with specific account
npm start -- --account muggles-school

# Start in auto mode
npm start -- --mode auto

# Resume workflow
npm start -- resume <workflow-id>
```

## Getting Help

- Check [README.md](../README.md) for full documentation
- Review [SETUP.md](./SETUP.md) for detailed setup
- Run `npm run validate` for diagnostics
- Check `.workflow-states/` for detailed logs

## Example Workflow

Here's what a typical workflow looks like:

```
$ npm start

🚀 Starting WeChat Article Workflow

━━━ Step 0: Configuration Check ━━━
[INFO] Checking configuration...
[SUCCESS] .env file found
[SUCCESS] Claude API key configured
[SUCCESS] Volcano API key configured
[SUCCESS] Found 1 account(s)

━━━ Step 1: Account Selection ━━━
? Select a WeChat account: (Use arrow keys)
❯ 麻瓜补习社 (muggles-school)

━━━ Step 2: Topic Brainstorming ━━━
? Enter a theme or keyword: AI trends in 2026

[INFO] Generating topic ideas...

Generated Topic Ideas:

1. The Rise of Multimodal AI: How 2026 Changed Everything
   Multimodal AI systems that understand text, images, video, and audio...

2. AI Agents Go Mainstream: What It Means for Businesses
   Autonomous AI agents are now handling complex tasks...

[... 3 more topics ...]

? Select a topic: (Use arrow keys)
❯ 1. The Rise of Multimodal AI...

━━━ Step 3: Research & Material Collection ━━━
? Would you like to search for reference materials? (Y/n)

[... continues through all 11 steps ...]

✅ Workflow completed successfully!

Draft saved to WeChat. View at: https://mp.weixin.qq.com
```

That's it! You're ready to generate amazing WeChat articles with AI.
