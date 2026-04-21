import { describe, it, expect } from 'vitest';
import { PromptManager } from './prompt-manager';
import type { AccountConfig } from '../types/account';

const MOCK_ACCOUNT: AccountConfig = {
  id: 'test-account',
  name: 'Test Account',
  appId: 'test-app-id',
  appSecret: 'test-secret',
  config: {
    defaultTheme: 'technology',
    imageStyle: 'minimal-clean',
    publishing: {
      defaultAuthor: 'Test Bot',
      autoPublish: false,
    },
  },
};

describe('PromptManager', () => {
  describe('constructor', () => {
    it('creates instance with no arguments', () => {
      const pm = new PromptManager();
      expect(pm).toBeInstanceOf(PromptManager);
    });

    it('creates instance with account config', () => {
      const pm = new PromptManager('test-account', MOCK_ACCOUNT);
      expect(pm).toBeInstanceOf(PromptManager);
    });
  });

  describe('getBrainstormPrompts', () => {
    it('returns prompts with theme', () => {
      const pm = new PromptManager();
      const { systemPrompt, userPrompt } = pm.getBrainstormPrompts('AI technology');

      expect(systemPrompt).toContain('content strategist');
      expect(userPrompt).toContain('AI technology');
      expect(userPrompt).toContain('JSON array');
    });

    it('returns prompts without theme (random)', () => {
      const pm = new PromptManager();
      const { systemPrompt, userPrompt } = pm.getBrainstormPrompts();

      expect(systemPrompt).toContain('content strategist');
      expect(userPrompt).toContain('different categories');
      expect(userPrompt).not.toContain('related to ""');
    });

    it('injects editorial context from brief', () => {
      const pm = new PromptManager('test', MOCK_ACCOUNT, {
        voice: 'casual and fun',
        audience: 'young developers',
        tone: 'casual',
      });

      const { systemPrompt } = pm.getBrainstormPrompts('test');
      expect(systemPrompt).toContain('casual and fun');
      expect(systemPrompt).toContain('young developers');
    });
  });

  describe('getOutlinePrompts', () => {
    it('returns outline prompts with topic info', () => {
      const pm = new PromptManager();
      const { systemPrompt, userPrompt } = pm.getOutlinePrompts({
        title: 'Test Article',
        description: 'A test article',
        keywords: ['test', 'article'],
      });

      expect(systemPrompt).toContain('outliner');
      expect(userPrompt).toContain('Test Article');
      expect(userPrompt).toContain('test, article');
    });

    it('includes research context when provided', () => {
      const pm = new PromptManager();
      const { userPrompt } = pm.getOutlinePrompts(
        { title: 'Test', description: 'Desc', keywords: ['test'] },
        'Some research material here'
      );

      expect(userPrompt).toContain('Some research material here');
    });
  });

  describe('getDraftPrompts', () => {
    const outline = {
      title: 'Test Article',
      sections: [
        { heading: 'Intro', points: ['point 1', 'point 2'] },
        { heading: 'Body', points: ['point 3'] },
      ],
      writingStyle: 'casual',
      tone: 'educational',
    };

    it('returns original mode prompts', () => {
      const pm = new PromptManager();
      const { systemPrompt, userPrompt } = pm.getDraftPrompts('original', outline);

      expect(systemPrompt).toContain('article writer');
      expect(userPrompt).toContain('original article');
      expect(userPrompt).toContain('Test Article');
    });

    it('returns rewrite mode prompts with research', () => {
      const pm = new PromptManager();
      const { userPrompt } = pm.getDraftPrompts('rewrite', outline, 'Research content');

      expect(userPrompt).toContain('Rewrite');
      expect(userPrompt).toContain('Research content');
    });

    it('returns expand mode prompts', () => {
      const pm = new PromptManager();
      const { userPrompt } = pm.getDraftPrompts('expand', outline);

      expect(userPrompt).toContain('Expand');
      expect(userPrompt).toContain('Test Article');
    });

    it('injects editorial context from brief', () => {
      const pm = new PromptManager('test', MOCK_ACCOUNT, {
        voice: 'witty and sharp',
      });

      const { systemPrompt } = pm.getDraftPrompts('original', outline);
      expect(systemPrompt).toContain('witty and sharp');
    });
  });

  describe('getAuthor', () => {
    it('returns account-configured author', () => {
      const pm = new PromptManager('test', MOCK_ACCOUNT);
      expect(pm.getAuthor('claude')).toBe('Test Bot');
    });

    it('falls back to AI (provider) when no account config', () => {
      const pm = new PromptManager();
      expect(pm.getAuthor('claude')).toBe('AI (claude)');
    });

    it('falls back to AI when no provider given', () => {
      const pm = new PromptManager();
      expect(pm.getAuthor()).toBe('AI');
    });
  });

  describe('getDefaultTheme', () => {
    it('returns account default theme', () => {
      const pm = new PromptManager('test', MOCK_ACCOUNT);
      expect(pm.getDefaultTheme()).toBe('technology');
    });

    it('returns undefined without account config', () => {
      const pm = new PromptManager();
      expect(pm.getDefaultTheme()).toBeUndefined();
    });
  });

  describe('getImageStyle', () => {
    it('returns account image style', () => {
      const pm = new PromptManager('test', MOCK_ACCOUNT);
      expect(pm.getImageStyle()).toBe('minimal-clean');
    });

    it('returns undefined without account config', () => {
      const pm = new PromptManager();
      expect(pm.getImageStyle()).toBeUndefined();
    });
  });

  describe('promptOverrides', () => {
    it('applies system prompt override', () => {
      const pm = new PromptManager('test', MOCK_ACCOUNT, {
        promptOverrides: {
          'step2-brainstorm': {
            systemPrompt: 'Custom system prompt',
          },
        },
      });

      const { systemPrompt, userPrompt } = pm.getBrainstormPrompts('test');
      expect(systemPrompt).toBe('Custom system prompt');
      expect(userPrompt).toContain('test'); // Still uses default user prompt
    });

    it('applies user prompt override', () => {
      const pm = new PromptManager('test', MOCK_ACCOUNT, {
        promptOverrides: {
          'step4-outline': {
            userPrompt: 'Custom user prompt',
          },
        },
      });

      const { userPrompt } = pm.getOutlinePrompts({
        title: 'Test',
        description: 'Desc',
        keywords: ['test'],
      });
      expect(userPrompt).toBe('Custom user prompt');
    });
  });

  describe('getEditorialContext', () => {
    it('returns empty string with no brief', () => {
      const pm = new PromptManager();
      expect(pm.getEditorialContext()).toBe('');
    });

    it('returns editorial context with all fields', () => {
      const pm = new PromptManager('test', MOCK_ACCOUNT, {
        voice: 'authoritative',
        audience: 'engineers',
        tone: 'formal',
        topicDomains: {
          include: ['tech', 'code'],
          exclude: ['politics'],
        },
      });

      const ctx = pm.getEditorialContext();
      expect(ctx).toContain('authoritative');
      expect(ctx).toContain('engineers');
      expect(ctx).toContain('formal');
      expect(ctx).toContain('tech, code');
      expect(ctx).toContain('politics');
    });
  });
});
