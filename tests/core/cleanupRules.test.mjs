/* eslint-disable require-jsdoc */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CleanupCadenceOptions,
  CleanupCadences,
  createCleanupRule,
  formatCadenceLabel,
  getRuleAlarmName,
  getRuleIdFromAlarmName,
  isRuleAlarmName,
} from '../../interface/core/cleanupRules.js';
import { CleanupScopes } from '../../interface/core/urlScope.js';

test('defines the supported cadence presets', () => {
  assert.deepEqual(
    CleanupCadenceOptions.map(option => option.id),
    [
      CleanupCadences.OneMinute,
      CleanupCadences.FifteenMinutes,
      CleanupCadences.OneHour,
      CleanupCadences.OneDay,
    ]
  );
});

test('creates a site rule from the current tab url', () => {
  const rule = createCleanupRule(
    'https://app.example.com/account',
    CleanupScopes.Site,
    CleanupCadences.FifteenMinutes
  );

  assert.equal(rule.scope, CleanupScopes.Site);
  assert.equal(rule.target, 'example.com');
  assert.equal(rule.hostname, 'app.example.com');
  assert.equal(rule.cadence, CleanupCadences.FifteenMinutes);
  assert.equal(rule.enabled, true);
});

test('creates a subdomain rule from the current tab url', () => {
  const rule = createCleanupRule(
    'https://app.example.com/account',
    CleanupScopes.Subdomain,
    CleanupCadences.OneHour
  );

  assert.equal(rule.target, 'app.example.com');
  assert.equal(formatCadenceLabel(rule.cadence), '1 hour');
});

test('formats alarm names predictably', () => {
  const alarmName = getRuleAlarmName('rule-123');

  assert.equal(isRuleAlarmName(alarmName), true);
  assert.equal(getRuleIdFromAlarmName(alarmName), 'rule-123');
});
