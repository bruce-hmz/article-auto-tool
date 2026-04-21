# TODOs

## ~~Clean up dead ClaudeClient code~~ DONE
- **What:** Removed `src/generators/claude-client.ts` (replaced by `src/llm/` multi-provider factory)
- **Completed:** 2026-04-20. File deleted. No imports pointed to it directly (only re-exported through `src/llm/`).

## Add SSRF protection to URLFetcher
- **What:** Add allow-listing, private IP blocking, and timeout configuration to `src/research/` URLFetcher
- **Why:** Step 3 fetches arbitrary URLs from user input and web search results. In multi-client operation, this is a liability
- **Pros:** Prevents accidental or malicious internal network access
- **Cons:** Adds complexity to research step
- **Context:** Deferred in Phase 1 review. Becomes critical when clients provide URLs through web interface (Phase 2). Found during /plan-eng-review on 2026-04-20.
- **Depends on:** Phase 2 (web interface)
