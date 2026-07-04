/* eslint-disable require-jsdoc */

import {
  CleanupScopes,
  getScopeDetails,
  getTargetForScope,
} from './urlScope.js';

export const CleanupCadences = Object.freeze({
  OneMinute: '1m',
  FifteenMinutes: '15m',
  OneHour: '1h',
  OneDay: '24h',
});

export const CleanupCadenceOptions = Object.freeze([
  { id: CleanupCadences.OneMinute, label: '1 minute', minutes: 1 },
  { id: CleanupCadences.FifteenMinutes, label: '15 minutes', minutes: 15 },
  { id: CleanupCadences.OneHour, label: '1 hour', minutes: 60 },
  { id: CleanupCadences.OneDay, label: '24 hours', minutes: 24 * 60 },
]);

export function getCadenceOption(cadenceId) {
  return (
    CleanupCadenceOptions.find(option => option.id === cadenceId) ||
    CleanupCadenceOptions[2]
  );
}

export function formatCadenceLabel(cadenceId) {
  return getCadenceOption(cadenceId).label;
}

export function getRuleAlarmName(ruleId) {
  return `cleanup-rule:${ruleId}`;
}

export function isRuleAlarmName(alarmName) {
  return alarmName.startsWith('cleanup-rule:');
}

export function getRuleIdFromAlarmName(alarmName) {
  return alarmName.replace(/^cleanup-rule:/, '');
}

export function createCleanupRule(url, scope, cadenceId) {
  const details = getScopeDetails(url);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    scope: scope,
    target: getTargetForScope(url, scope),
    hostname: details.hostname,
    cadence: getCadenceOption(cadenceId).id,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    lastRunAt: null,
    lastRunStatus: null,
    lastRunRemovedCount: 0,
  };
}

export function updateRuleTimestamp(rule) {
  return {
    ...rule,
    updatedAt: new Date().toISOString(),
  };
}

export function isSameRuleTarget(rule, candidate) {
  return rule.scope === candidate.scope && rule.target === candidate.target;
}

export function formatRuleTarget(rule) {
  if (rule.scope === CleanupScopes.Site) {
    return rule.target;
  }
  return rule.target;
}
