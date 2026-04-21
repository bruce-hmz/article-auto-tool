# API Reference

This document provides detailed information about the APIs used in the WeChat article generator.

## Claude API

### Purpose
Used for content generation: brainstorming, outlining, and article writing.

### Configuration

```typescript
{
  model: "claude-sonnet-4-6",
  maxTokens: 4096,
  temperature: 0.7
}
```

### Implementation

**File**: `src/generators/claude-client.ts`

```typescript
class ClaudeClient {
  constructor(
    apiKey: string,
    model: string = 'claude-sonnet-4-6',
    maxTokens: number = 4096,
    temperature: number = 0.7
  )

  async generate(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string>

  async generateWithRetry(
    systemPrompt: string,
    userPrompt: string,
    maxRetries: number = 3
  ): Promise<string>
}
```

### Usage in Workflow

1. **Step 2 - Brainstorming**
   - System: Expert content strategist
   - Input: Theme or random
   - Output: 5 topic ideas in JSON format

2. **Step 4 - Outline**
   - System: Expert article outliner
   - Input: Topic + research materials
   - Output: Outline in JSON format

3. **Step 5 - Draft**
   - System: Expert article writer
   - Input: Outline + mode
   - Output: Full article in Markdown

### Response Format

All Claude responses are expected in JSON format:

```json
{
  "title": "Article Title",
  "description": "Description",
  "keywords": ["keyword1", "keyword2"],
  "sections": [
    {
      "heading": "Section Heading",
      "points": ["Point 1", "Point 2"]
    }
  ]
}
```

### Error Handling

- Exponential backoff retry (2^n seconds)
- Maximum 3 retries
- Detailed error logging

### Rate Limits

- Depends on your Claude API plan
- Default: 100,000 tokens per minute
- Monitor usage in Anthropic console

---

## Volcano Engine API

### Purpose
Used for image generation: cover images and illustrations.

### Configuration

```typescript
{
  provider: "volcano",
  model: "doubao-seedream-4-5-251128",
  defaultStyle: "modern-tech",
  coverImageRatio: "2.35:1",
  illustrationRatio: "16:9"
}
```

### Implementation

**File**: `src/generators/image-generator.ts`

```typescript
class ImageGenerator {
  constructor(
    apiKey: string,
    model: string = 'doubao-seedream-4-5-251128'
  )

  async generateImage(
    prompt: ImagePrompt,
    outputPath: string
  ): Promise<GeneratedImage>

  async generateCoverImage(
    title: string,
    style: string,
    outputPath: string
  ): Promise<GeneratedImage>

  async generateIllustration(
    context: string,
    style: string,
    outputPath: string
  ): Promise<GeneratedImage>
}
```

### API Endpoint

```
POST https://ark.cn-beijing.volces.com/api/v3/images/generations
```

### Request Format

```json
{
  "model": "doubao-seedream-4-5-251128",
  "prompt": "description, style",
  "size": "1024x576",
  "n": 1,
  "response_format": "url"
}
```

### Response Format

```json
{
  "data": [
    {
      "url": "https://..."
    }
  ]
}
```

### Image Sizes

Mapped from aspect ratios:

| Aspect Ratio | Size | Use Case |
|--------------|------|----------|
| 2.35:1 | 1024x436 | Cover image |
| 16:9 | 1024x576 | Illustrations |
| 4:3 | 1024x768 | Alternative |
| 1:1 | 1024x1024 | Square |

### Usage in Workflow

1. **Step 7 - Cover Image**
   - Prompt: Based on article title
   - Style: Professional, eye-catching
   - Ratio: 2.35:1

2. **Step 8 - Illustrations**
   - Prompt: Based on section content
   - Style: Clean, informative
   - Ratio: 16:9
   - Count: 2-3 images

### Error Handling

- Automatic retry on failure
- Fallback: Continue without image if failed
- Logging: Detailed error messages

### Rate Limits

- Depends on Volcano Engine plan
- Typical: 10-20 requests per minute
- Images generated in 10-30 seconds each

---

## WeChat Official Account API

### Purpose
Used for publishing: image upload and draft creation.

### Configuration

```typescript
{
  appId: string,
  appSecret: string
}
```

### Implementation

**File**: `src/accounts/wechat-api.ts`

```typescript
class WeChatAPI {
  constructor(credentials: WeChatCredentials)

  async getAccessToken(): Promise<string>

  async uploadImage(imagePath: string): Promise<{
    mediaId: string;
    url: string;
  }>

  async uploadNewsImage(imagePath: string): Promise<string>

  async saveDraft(publishingInfo: PublishingInfo): Promise<string>

  async testConnection(): Promise<boolean>
}
```

### API Endpoints

#### 1. Get Access Token

```
GET https://api.weixin.qq.com/cgi-bin/token
  ?grant_type=client_credential
  &appid={APPID}
  &secret={APPSECRET}
```

**Response**:
```json
{
  "access_token": "ACCESS_TOKEN",
  "expires_in": 7200
}
```

#### 2. Upload Image (Permanent Material)

```
POST https://api.weixin.qq.com/cgi-bin/material/add_material
  ?access_token={ACCESS_TOKEN}
  &type=thumb
```

**Body**: FormData with image file

**Response**:
```json
{
  "media_id": "MEDIA_ID",
  "url": "IMAGE_URL"
}
```

#### 3. Upload News Image (Temporary)

```
POST https://api.weixin.qq.com/cgi-bin/media/uploadimg
  ?access_token={ACCESS_TOKEN}
```

**Body**: FormData with image file

**Response**:
```json
{
  "url": "IMAGE_URL"
}
```

#### 4. Save Draft

```
POST https://api.weixin.qq.com/cgi-bin/draft/add
  ?access_token={ACCESS_TOKEN}
```

**Body**:
```json
{
  "articles": [
    {
      "title": "Article Title",
      "author": "Author Name",
      "digest": "Article summary...",
      "content": "<p>HTML content...</p>",
      "thumb_media_id": "MEDIA_ID",
      "content_source_url": "",
      "need_open_comment": 0,
      "only_fans_can_comment": 0
    }
  ]
}
```

**Response**:
```json
{
  "media_id": "DRAFT_MEDIA_ID"
}
```

### Token Management

- Access tokens expire in 2 hours (7200 seconds)
- Automatic refresh 5 minutes before expiry
- Cached in memory during workflow execution

### Usage in Workflow

**Step 10 - Publish**:
1. Get access token
2. Upload cover image (get media_id)
3. Upload inline images (get URLs)
4. Save draft with content and media_id

### Error Handling

**Common Errors**:

| Error Code | Description | Solution |
|------------|-------------|----------|
| 40001 | Invalid AppSecret | Check credentials |
| 40014 | Invalid access_token | Refresh token |
| 41001 | Missing access_token | Get new token |
| 42001 | access_token expired | Refresh token |
| 45009 | API frequency limit | Wait and retry |
| 87009 | IP not in whitelist | Add IP to whitelist |

### Rate Limits

- Access token: Refresh every 2 hours
- API calls: Varies by account type
- Typical: 1000-10,000 calls per day

### IP Whitelist

**Important**: WeChat API requires IP whitelist.

1. Get your server IP address
2. Log in to WeChat Official Account
3. Go to Settings → Basic Configuration
4. Add IP to whitelist

### Testing

Use `testConnection()` method:

```typescript
const wechatApi = new WeChatAPI(credentials);
const isConnected = await wechatApi.testConnection();
```

---

## Web Search API

### Purpose
Used for research: finding reference materials.

### Implementation

**File**: `src/research/web-search.ts`

```typescript
class WebSearch {
  async search(
    query: string,
    maxResults: number = 5
  ): Promise<SearchResult[]>

  async searchWithRetry(
    query: string,
    maxResults: number = 5,
    maxRetries: number = 3
  ): Promise<SearchResult[]>
}
```

### Status

**Note**: Currently a placeholder implementation.

To enable web search, integrate with:
- Google Custom Search API
- Bing Search API
- DuckDuckGo
- SerpAPI

### Expected Interface

```typescript
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}
```

---

## URL Fetcher

### Purpose
Used for research: fetching content from URLs.

### Implementation

**File**: `src/research/url-fetcher.ts`

```typescript
class URLFetcher {
  constructor(timeout: number = 30000)

  async fetch(url: string): Promise<URLContent>

  async fetchMultiple(urls: string[]): Promise<URLContent[]>
}
```

### Response Format

```typescript
interface URLContent {
  url: string;
  title: string;
  content: string;
  error?: string;
}
```

### Content Extraction

1. Fetch HTML from URL
2. Extract title from `<title>` or `<h1>`
3. Remove scripts and styles
4. Strip HTML tags
5. Clean up whitespace
6. Limit to 10,000 characters

### Error Handling

- Timeout: 30 seconds default
- Network errors: Return error message
- Invalid URLs: Return error message

---

## Best Practices

### API Key Security

1. Never commit API keys to version control
2. Use environment variables
3. Restrict API key permissions
4. Monitor API usage

### Rate Limiting

1. Implement exponential backoff
2. Cache access tokens
3. Batch API calls when possible
4. Monitor usage quotas

### Error Handling

1. Log detailed error messages
2. Provide user-friendly error descriptions
3. Implement retry logic
4. Graceful degradation

### Performance

1. Use caching where possible
2. Parallelize independent operations
3. Optimize prompt lengths
4. Monitor response times

## Monitoring

### Logging

All API calls are logged with:
- Timestamp
- API name
- Request parameters
- Response time
- Status (success/failure)

### Metrics

Track:
- API call frequency
- Success/failure rates
- Response times
- Token usage (Claude)
- Image generation times

### Alerts

Set up alerts for:
- API quota exhaustion
- Authentication failures
- Rate limit exceeded
- Network errors

## Troubleshooting

### Claude API Issues

- Check API key validity
- Verify token limits
- Monitor usage in console
- Check prompt format

### Volcano Engine Issues

- Verify API key
- Check image size limits
- Monitor generation times
- Test with simple prompts

### WeChat API Issues

- Verify AppID and AppSecret
- Check IP whitelist
- Monitor access token expiry
- Check API call limits

### Network Issues

- Check internet connection
- Verify firewall settings
- Test API endpoints manually
- Check proxy settings
