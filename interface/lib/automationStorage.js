/* eslint-disable require-jsdoc */

import {
  createCleanupRule,
  isSameRuleTarget,
  updateRuleTimestamp,
} from './cleanupRules.js';

const rulesStorageKey = 'cleanup_rules';

export class AutomationStorage {
  /**
   * @param {GenericStorageHandler} storageHandler
   */
  constructor(storageHandler) {
    this.storageHandler = storageHandler;
  }

  async listRules() {
    const storedRules = await this.storageHandler.getLocal(rulesStorageKey);
    if (!Array.isArray(storedRules)) {
      return [];
    }
    return storedRules;
  }

  async saveRules(rules) {
    await this.storageHandler.setLocal(rulesStorageKey, rules);
    return rules;
  }

  async upsertRule(url, scope, cadenceId) {
    const candidateRule = createCleanupRule(url, scope, cadenceId);
    const rules = await this.listRules();
    const existingRule = rules.find(rule =>
      isSameRuleTarget(rule, candidateRule)
    );
    if (existingRule) {
      existingRule.cadence = candidateRule.cadence;
      existingRule.enabled = true;
      existingRule.hostname = candidateRule.hostname;
      existingRule.updatedAt = candidateRule.updatedAt;
      await this.saveRules(rules);
      return existingRule;
    }

    rules.push(candidateRule);
    await this.saveRules(rules);
    return candidateRule;
  }

  async updateRule(ruleId, updates) {
    const rules = await this.listRules();
    const nextRules = rules.map(rule => {
      if (rule.id !== ruleId) {
        return rule;
      }
      return updateRuleTimestamp({
        ...rule,
        ...updates,
      });
    });
    await this.saveRules(nextRules);
    return nextRules.find(rule => rule.id === ruleId) || null;
  }

  async removeRule(ruleId) {
    const rules = await this.listRules();
    const nextRules = rules.filter(rule => rule.id !== ruleId);
    await this.saveRules(nextRules);
    return nextRules;
  }

  async recordRuleRun(ruleId, details) {
    return this.updateRule(ruleId, {
      lastRunAt: new Date().toISOString(),
      lastRunStatus: details.status,
      lastRunRemovedCount: details.removedCount,
    });
  }
}
