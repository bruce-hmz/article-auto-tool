import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StateManager } from './state-manager';

describe('StateManager', () => {
  let stateManager: StateManager;
  const testDir = '.test-workflow-states';

  beforeEach(async () => {
    stateManager = new StateManager(testDir);
    await stateManager.initialize();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('createWorkflow', () => {
    it('creates workflow with date-only path when no accountId', async () => {
      const state = await stateManager.createWorkflow('auto');

      const today = new Date().toISOString().split('T')[0];
      expect(state.outputPath).toBe(path.join('output', today));
      expect(state.accountId).toBeUndefined();
    });

    it('creates workflow with accountId in output path when accountId provided', async () => {
      const state = await stateManager.createWorkflow('auto', 'my-account');

      const today = new Date().toISOString().split('T')[0];
      expect(state.outputPath).toBe(path.join('output', 'my-account', today));
      expect(state.accountId).toBe('my-account');
    });

    it('uses custom outputPath when provided', async () => {
      const state = await stateManager.createWorkflow('auto', undefined, 'custom/path');

      expect(state.outputPath).toBe('custom/path');
    });
  });

  describe('updateOutputPath', () => {
    it('updates outputPath to include accountId', async () => {
      const state = await stateManager.createWorkflow('auto');
      expect(state.accountId).toBeUndefined();

      const today = new Date().toISOString().split('T')[0];
      // Initially no accountId in path
      expect(state.outputPath).toBe(path.join('output', today));

      // Update with accountId
      await stateManager.updateOutputPath(state.workflowId, 'account-123');

      const updated = await stateManager.load(state.workflowId);
      expect(updated?.accountId).toBe('account-123');
      expect(updated?.outputPath).toBe(path.join('output', 'account-123', today));
    });

    it('throws for non-existent workflow', async () => {
      await expect(
        stateManager.updateOutputPath('nonexistent-id', 'account')
      ).rejects.toThrow('not found');
    });
  });

  describe('save and load', () => {
    it('persists and loads workflow state', async () => {
      const created = await stateManager.createWorkflow('step_by_step', 'test-acct');
      const loaded = await stateManager.load(created.workflowId);

      expect(loaded).not.toBeNull();
      expect(loaded?.workflowId).toBe(created.workflowId);
      expect(loaded?.accountId).toBe('test-acct');
      expect(loaded?.mode).toBe('step_by_step');
    });

    it('returns null for non-existent workflow', async () => {
      const loaded = await stateManager.load('nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('updateStep', () => {
    it('updates step status and advances currentStep on completion', async () => {
      const state = await stateManager.createWorkflow('auto');

      await stateManager.updateStep(state.workflowId, 0, 'completed', { test: true });

      const updated = await stateManager.load(state.workflowId);
      expect(updated?.currentStep).toBe(1);
      expect(updated?.stepResults[0].status).toBe('completed');
      expect(updated?.stepResults[0].completedAt).toBeDefined();
    });

    it('does not advance currentStep on non-completed status', async () => {
      const state = await stateManager.createWorkflow('auto');

      await stateManager.updateStep(state.workflowId, 0, 'in_progress');

      const updated = await stateManager.load(state.workflowId);
      expect(updated?.currentStep).toBe(0);
      expect(updated?.stepResults[0].completedAt).toBeUndefined();
    });
  });
});
