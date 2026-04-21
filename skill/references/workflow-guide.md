# Workflow Guide

This document provides detailed information about the WeChat article generation workflow.

## Workflow Architecture

The workflow is built on a modular step-based system:

```
WorkflowEngine
    ├── StateManager (persistence)
    ├── StepManager (orchestration)
    └── Steps (1-11)
        ├── Generators (Claude, Images)
        ├── Research Tools (Web Search, URL Fetcher)
        └── WeChat API
```

## Step Details

### Step 0: Configuration Check

**Purpose**: Validate environment and credentials before starting

**Actions**:
- Check `.env` file exists
- Verify API keys are set
- Load and validate account configurations
- Test basic connectivity

**Output**: Validation report

**Errors**:
- Missing `.env` file
- Missing API keys
- Invalid account configurations

---

### Step 1: Account Selection

**Purpose**: Select target WeChat Official Account

**Actions**:
- Load all configured accounts
- Display account list
- Prompt user to select account
- Validate selected account

**Output**: Selected account configuration

**Context Data**:
- `accountId`
- `accountName`
- `accountConfig`

---

### Step 2: Topic Brainstorming

**Purpose**: Generate topic ideas for the article

**Actions**:
- Ask user for theme or direction (optional)
- Generate 5 topic ideas using Claude
- Display topics with descriptions
- Let user select or enter custom topic

**Output**: `output/YYYY-MM-DD/topic/02-topics.json`

**Context Data**:
- `selectedTopic`: TopicIdea object

**Claude Prompt**:
- System: Expert content strategist
- Task: Generate engaging topic ideas
- Format: JSON array with title, description, keywords, reasoning

---

### Step 3: Research & Material Collection

**Purpose**: Gather reference materials

**Actions**:
- Ask if user wants to search for references
- Perform web search (if enabled)
- Fetch URLs provided by user
- Allow manual notes input

**Output**: `output/YYYY-MM-DD/topic/03-research.json`

**Context Data**:
- `researchMaterials`: ResearchMaterial[]

**Optional**: This step can be skipped if no research is needed

---

### Step 4: Generate Outline

**Purpose**: Create article structure and title

**Actions**:
- Generate outline using Claude
- Create 3-5 main sections
- Define 2-4 points per section
- Suggest writing style and tone
- Display outline for review
- Allow manual modifications

**Output**:
- `output/YYYY-MM-DD/topic/04-outline.json`
- `output/YYYY-MM-DD/topic/04-outline.md`

**Context Data**:
- `outline`: Outline object

**Key Checkpoint**: ⭐ Requires user confirmation

**Claude Prompt**:
- System: Expert article outliner
- Input: Topic + research materials
- Output: JSON with title, sections, style, tone

---

### Step 5: Write Draft

**Purpose**: Generate full article content

**Actions**:
- Ask user for writing mode (original/rewrite/expand)
- Generate article using Claude
- Display preview and word count
- Allow regeneration if needed

**Output**: `output/YYYY-MM-DD/topic/05-draft.md`

**Context Data**:
- `article`: Article object

**Key Checkpoint**: ⭐ Requires user confirmation

**Writing Modes**:
- **Original**: Create from scratch
- **Rewrite**: Based on research materials
- **Expand**: Expand outline into full article

---

### Step 6: Format Text

**Purpose**: Apply Markdown formatting

**Actions**:
- Add frontmatter (title, author, date, keywords)
- Optimize heading hierarchy
- Add Chinese-English spacing
- Optimize paragraph breaks
- Calculate word count and reading time

**Output**: `output/YYYY-MM-DD/topic/06-formatted.md`

**Context Data**:
- `formattedArticle`: FormattedArticle object

---

### Step 7: Generate Cover Image

**Purpose**: Create article cover image

**Actions**:
- Use Volcano Engine API
- Generate based on article title
- Apply professional style
- Save as PNG

**Output**: `output/YYYY-MM-DD/topic/images/cover.png`

**Context Data**:
- `coverImage`: GeneratedImage object

**Image Specs**:
- Aspect ratio: 2.35:1 (WeChat recommended)
- Style: Modern, professional, eye-catching

---

### Step 8: Generate Illustrations

**Purpose**: Create inline article illustrations

**Actions**:
- Extract key sections from article
- Generate 2-3 illustrations
- Use Volcano Engine API
- Save as PNG files

**Output**: `output/YYYY-MM-DD/topic/images/illustration-*.png`

**Context Data**:
- `illustrations`: GeneratedImage[]

**Image Specs**:
- Aspect ratio: 16:9
- Style: Modern, clean, informative

---

### Step 9: Preview Before Publishing

**Purpose**: Review final article

**Actions**:
- Convert Markdown to HTML
- Apply WeChat-friendly styles
- Generate digest/summary
- Display complete preview
- Ask for final approval

**Output**: `output/YYYY-MM-DD/topic/09-preview.html`

**Context Data**:
- `publishingInfo`: Publishing info object

**Key Checkpoint**: ⭐ Requires user confirmation

---

### Step 10: Publish to WeChat

**Purpose**: Save article to WeChat draft box

**Actions**:
- Initialize WeChat API
- Test API connection
- Upload cover image
- Save article as draft
- Return draft media ID

**Output**: Draft saved to WeChat

**Context Data**:
- `draftMediaId`: string
- `publishedAt`: timestamp

**Key Checkpoint**: ⭐ Requires user confirmation

**WeChat API Calls**:
1. `GET /token` - Get access token
2. `POST /material/add_material` - Upload cover image
3. `POST /draft/add` - Save draft

---

## State Management

### Workflow State

Saved to `.workflow-states/<workflow-id>.json`:

```json
{
  "workflowId": "uuid",
  "mode": "key_checkpoint",
  "status": "running|paused|completed|failed",
  "currentStep": 5,
  "accountId": "muggles-school",
  "outputPath": "output/2026-02-26/topic",
  "startedAt": "2026-02-26T10:00:00Z",
  "updatedAt": "2026-02-26T10:15:00Z",
  "metadata": {},
  "stepResults": {
    "0": {
      "status": "completed",
      "data": {},
      "completedAt": "2026-02-26T10:00:05Z"
    }
  }
}
```

### Resume Behavior

When resuming a workflow:
1. Load state from JSON file
2. Start from `currentStep`
3. Skip completed steps
4. Continue execution

### Cleanup

Old workflow states are automatically cleaned up after 7 days.

## Error Handling

### Error Types

1. **Configuration Errors**
   - Missing API keys
   - Invalid account configuration
   - Action: Fix configuration and retry

2. **API Errors**
   - Invalid credentials
   - Rate limits exceeded
   - Network timeouts
   - Action: Wait and retry, or check credentials

3. **User Cancellation**
   - User says "no" at checkpoint
   - Action: Mark workflow as paused

4. **Processing Errors**
   - Failed to parse AI response
   - Image generation failed
   - Action: Retry with different parameters

### Retry Mechanism

Most API calls implement exponential backoff:
- Attempt 1: Immediate
- Attempt 2: Wait 2 seconds
- Attempt 3: Wait 4 seconds

## Performance Considerations

### Timing Estimates

- Step 0: ~1 second
- Step 1: ~2 seconds
- Step 2: ~10-20 seconds (Claude API)
- Step 3: ~5-30 seconds (depends on research)
- Step 4: ~15-25 seconds (Claude API)
- Step 5: ~30-60 seconds (Claude API)
- Step 6: ~1 second
- Step 7: ~15-30 seconds (Image generation)
- Step 8: ~45-90 seconds (Multiple images)
- Step 9: ~2 seconds
- Step 10: ~10-20 seconds (WeChat API)

**Total**: ~3-6 minutes (depending on research and images)

### Optimization Tips

1. Skip research step if not needed
2. Reduce number of illustrations
3. Use smaller max_tokens for faster generation
4. Run in auto mode to avoid wait times

## Customization

### Custom Prompts

You can modify Claude prompts in the step files:

- `src/steps/step2-brainstorm.ts`
- `src/steps/step4-outline.ts`
- `src/steps/step5-draft.ts`

### Custom Styles

Edit `config/settings.json`:

```json
{
  "imageGeneration": {
    "defaultStyle": "your-custom-style"
  }
}
```

### Custom Themes

Add themes in account configuration:

```json
{
  "config": {
    "defaultTheme": "your-theme",
    "imageStyle": "your-style"
  }
}
```

## Best Practices

1. **Review at Checkpoints**: Always review outlines and drafts
2. **Provide Clear Topics**: Be specific about what you want
3. **Use Research**: Enable research for better accuracy
4. **Check Outputs**: Review generated files before publishing
5. **Test First**: Run in key_checkpoint mode initially
6. **Backup States**: Keep `.workflow-states/` in version control
7. **Monitor Credits**: Keep track of API usage and costs

## Advanced Workflows

### Batch Processing

```bash
# Create multiple articles
for topic in "AI" "Blockchain" "IoT"; do
  bun run src/index.ts start --mode auto
done
```

### Custom Step Skipping

Modify step execution in workflow engine to skip specific steps.

### Integration with CI/CD

Output files can be processed by:
- Static site generators
- Version control systems
- Content management systems
- Automated publishing pipelines
