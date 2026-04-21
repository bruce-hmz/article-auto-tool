# 🚀 Get Started Now!

Your WeChat Article Generation System is ready! Follow these steps to run your first workflow.

## ✅ What's Installed

- ✅ All TypeScript source code (35+ files)
- ✅ All dependencies installed (144 packages)
- ✅ Configuration files ready
- ✅ Complete documentation
- ✅ Claude Code Skill defined

## 📋 Prerequisites Checklist

Before starting, make sure you have:

### Required API Keys

- [ ] **Anthropic API Key** (for Claude AI)
  - Get it from: https://console.anthropic.com
  - Used for: Topic generation, outlining, article writing

- [ ] **Volcano Engine API Key** (for image generation)
  - Get it from: https://www.volcengine.com
  - Used for: Cover images and illustrations

- [ ] **WeChat Official Account** (for publishing)
  - Already have an account at: https://mp.weixin.qq.com
  - Need: AppID and AppSecret
  - Important: Configure IP whitelist

## 🔧 Quick Setup (5 Minutes)

### Step 1: Create Environment File

```bash
cp .env.example .env
```

### Step 2: Edit `.env` File

Open `.env` in your editor and add your API keys:

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here

# Volcano Engine
VOLCANO_API_KEY=your-actual-volcano-key-here

# WeChat Account
WECHAT_APP_ID_MUGGLES=wx your-actual-app-id
WECHAT_APP_SECRET_MUGGLES=your-actual-app-secret
```

### Step 3: Configure Account

```bash
cp config/accounts/muggles.json.example config/accounts/muggles.json
```

The file should look like this (environment variables will be auto-replaced):

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

### Step 4: Validate Configuration

```bash
npm run validate
```

You should see:

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

### Step 5: Run Your First Workflow!

```bash
npm start
```

## 🎯 What Will Happen

The workflow will guide you through 11 steps:

1. **Config Check** - Verifies everything is ready
2. **Account Selection** - Choose your WeChat account
3. **Topic Brainstorming** - AI generates 5 topic ideas, you pick one
4. **Research** - Optional: gather reference materials
5. **Generate Outline** - AI creates article structure (you review)
6. **Write Draft** - AI writes full article (you review)
7. **Format Text** - Apply Markdown formatting
8. **Generate Cover** - AI creates cover image
9. **Generate Illustrations** - AI creates 2-3 inline images
10. **Preview** - Review final article (you confirm)
11. **Publish** - Save to WeChat draft box (you confirm)

**Total Time**: 3-6 minutes

## 💡 Tips for First Run

### Choose Good Topics

When prompted for a theme, try specific topics like:
- "AI trends in education"
- "Future of remote work"
- "Digital transformation for small businesses"
- "Sustainable technology innovations"

Not vague ones like:
- "technology" (too broad)
- "business" (too general)

### Use Key Checkpoint Mode

For your first run, use the default mode (key_checkpoint) which pauses at important decisions:
- Step 4: Review outline
- Step 5: Review article draft
- Step 9: Final preview
- Step 10: Confirm publishing

### Review Carefully

At each checkpoint, take time to:
- Read the outline thoroughly
- Check the article quality
- Review images
- Make sure everything looks good

## 📂 Check Your Output

After the workflow completes, check the output directory:

```bash
ls -R output/
```

You'll find:

```
output/2026-02-26/topic-name/
├── 02-topics.json         # All generated topics
├── 03-research.json       # Research materials
├── 04-outline.json        # Outline data
├── 04-outline.md          # Human-readable outline
├── 05-draft.md            # Article draft
├── 06-formatted.md        # Final formatted article
├── 09-preview.html        # HTML preview
└── images/
    ├── cover.png          # Cover image
    └── illustration-*.png # Illustrations
```

## 🎉 View in WeChat

1. Log in to https://mp.weixin.qq.com
2. Go to 素材管理 (Material Management)
3. Check 草稿箱 (Draft Box)
4. Your article should be there!

## 🔄 Resume If Interrupted

If the workflow is interrupted (network issue, you close terminal, etc.):

```bash
# List all workflows
npm start -- status

# Resume specific workflow
npm start -- resume <workflow-id>
```

## 📚 Learn More

- **Quick Start**: `docs/QUICKSTART.md`
- **Full Setup**: `docs/SETUP.md`
- **Complete Docs**: `README.md`
- **Project Summary**: `PROJECT_SUMMARY.md`

## ⚠️ Common Issues

### "API key not found"
- Make sure `.env` file exists
- Check variable names are exact
- Restart terminal after creating `.env`

### "Account validation failed"
- Check `config/accounts/muggles.json` exists
- Verify JSON syntax is valid
- Ensure environment variables match `.env`

### "WeChat API connection failed"
- Verify AppID and AppSecret are correct
- Check IP whitelist in WeChat settings
- Make sure account is active

### "Image generation failed"
- Check Volcano API key is valid
- Verify you have credits
- Try with different topic

## 🆘 Need Help?

1. Run `npm run validate` to check configuration
2. Check `.workflow-states/` for detailed error logs
3. Read the documentation in `docs/` folder
4. Review `README.md` for troubleshooting

## 🎯 Commands Reference

```bash
# Validate configuration
npm run validate

# Start workflow (key_checkpoint mode)
npm start

# Start with auto mode
npm start -- --mode auto

# Start with step-by-step mode
npm start -- --mode step_by_step

# List accounts
npm start -- accounts

# List workflows
npm start -- status

# Resume workflow
npm start -- resume <workflow-id>

# Show help
npm start -- --help
```

## ✨ You're Ready!

Everything is installed and configured. Now:

1. Add your API keys to `.env`
2. Run `npm run validate`
3. Execute `npm start`
4. Follow the prompts
5. Get your first AI-generated WeChat article!

Good luck! 🍀

---

**Questions?** Check the documentation:
- Quick questions → `docs/QUICKSTART.md`
- Setup issues → `docs/SETUP.md`
- Detailed info → `README.md`
- Project overview → `PROJECT_SUMMARY.md`
