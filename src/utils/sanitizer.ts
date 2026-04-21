/**
 * Sanitize user input to prevent prompt injection attacks.
 *
 * Strips common injection patterns from theme/direction inputs
 * before they are interpolated into LLM prompts.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+(instructions|prompts|context)/gi,
  /disregard\s+(all\s+)?previous\s+(instructions|prompts)/gi,
  /forget\s+(everything|all|what you know)/gi,
  /you\s+are\s+now\s+/gi,
  /new\s+instructions?\s*:/gi,
  /system\s*:\s*/gi,
  /\[system\]/gi,
  /\<\/?system\>/gi,
  /act\s+as\s+if\s+/gi,
  /pretend\s+(you\s+are|to\s+be)\s+/gi,
  /override\s+(your|the)\s+(instructions|prompt|system)/gi,
];

const MAX_INPUT_LENGTH = 1000;

export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  reason?: string;
}

/**
 * Sanitize a user input string for safe interpolation into LLM prompts.
 * Returns the sanitized string and metadata about what changed.
 */
export function sanitizePromptInput(input: string): SanitizationResult {
  if (!input || input.trim().length === 0) {
    return { sanitized: '', wasModified: false };
  }

  let sanitized = input;
  let wasModified = false;
  const reasons: string[] = [];

  // Truncate overly long input
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH);
    wasModified = true;
    reasons.push(`Input truncated to ${MAX_INPUT_LENGTH} characters`);
  }

  // Strip injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '[filtered]');
      wasModified = true;
      reasons.push('Potential prompt injection pattern removed');
    }
  }

  // Collapse multiple [filtered] markers
  sanitized = sanitized.replace(/(\[filtered\]\s*)+/g, '[filtered] ');

  return {
    sanitized: sanitized.trim(),
    wasModified,
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  };
}
