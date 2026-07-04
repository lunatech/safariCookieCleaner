/* eslint-disable require-jsdoc */

import assert from 'node:assert/strict';
import test from 'node:test';

import { AutomationStorage } from '../../interface/core/automationStorage.js';
import { CleanupCadences } from '../../interface/core/cleanupRules.js';
import { CleanupScopes } from '../../interface/core/urlScope.js';

class FakeStorageHandler {
  constructor() {
    this.values = new Map();
  }

  async getLocal(key) {
    return this.values.get(key) ?? null;
  }

  async setLocal(key, value) {
    this.values.set(key, value);
  }
}

test('upserts rules by target and scope', async () => {
  const storage = new AutomationStorage(new FakeStorageHandler());

  const firstRule = await storage.upsertRule(
    'https://app.example.com',
    CleanupScopes.Site,
    CleanupCadences.OneMinute
  );
  const secondRule = await storage.upsertRule(
    'https://app.example.com',
    CleanupScopes.Site,
    CleanupCadences.OneHour
  );

  const rules = await storage.listRules();
  assert.equal(rules.length, 1);
  assert.equal(firstRule.id, secondRule.id);
  assert.equal(secondRule.cadence, CleanupCadences.OneHour);
});

test('records the last run state', async () => {
  const storage = new AutomationStorage(new FakeStorageHandler());
  const rule = await storage.upsertRule(
    'https://app.example.com',
    CleanupScopes.Subdomain,
    CleanupCadences.FifteenMinutes
  );

  const updatedRule = await storage.recordRuleRun(rule.id, {
    status: 'Removed 4 cookies',
    removedCount: 4,
  });

  assert.equal(updatedRule.lastRunStatus, 'Removed 4 cookies');
  assert.equal(updatedRule.lastRunRemovedCount, 4);
  assert.notEqual(updatedRule.lastRunAt, null);
});
