/* eslint-disable require-jsdoc */

import { AutomationStorage } from './interface/core/automationStorage.js';
import {
  getCadenceOption,
  getRuleAlarmName,
  getRuleIdFromAlarmName,
  isRuleAlarmName,
} from './interface/core/cleanupRules.js';
import { deleteCookiesForRule } from './interface/core/cookieCleaner.js';
import { BrowserDetector } from './interface/lib/browserDetector.js';
import { Browsers } from './interface/lib/browsers.js';
import { GenericStorageHandler } from './interface/lib/genericStorageHandler.js';

const browserDetector = new BrowserDetector();
const storageHandler = new GenericStorageHandler(browserDetector);
const automationStorage = new AutomationStorage(storageHandler);
const api = browserDetector.getApi();

(async function initBackground() {
  console.log('starting background script');
  await configurePopupForIos();
  if (api.alarms) {
    api.alarms.onAlarm.addListener(onAlarm);
  }
  if (api.storage?.onChanged) {
    api.storage.onChanged.addListener(onStorageChanged);
  }
  if (api.runtime?.onInstalled) {
    api.runtime.onInstalled.addListener(syncRuleAlarms);
  }
  if (api.runtime?.onStartup) {
    api.runtime.onStartup.addListener(syncRuleAlarms);
  }
  await syncRuleAlarms();
})();

async function configurePopupForIos() {
  const isSafariIos = await detectSafariIos();
  if (!isSafariIos) {
    return;
  }

  browserDetector.overrideBrowserName(Browsers.Safari);
  await api.action.setPopup({
    popup: '/interface/popup-mobile/cookie-list.html',
  });
}

async function detectSafariIos() {
  const platformInfo = await api.runtime.getPlatformInfo();
  return platformInfo.os === 'ios';
}

async function onStorageChanged(changes, areaName) {
  if (areaName !== 'local' || !changes.cleanup_rules) {
    return;
  }

  await syncRuleAlarms();
}

async function syncRuleAlarms() {
  if (!api.alarms) {
    return;
  }

  const rules = await automationStorage.listRules();
  const enabledRules = rules.filter(rule => rule.enabled !== false);
  const enabledAlarmNames = new Set(
    enabledRules.map(rule => getRuleAlarmName(rule.id))
  );
  const alarms = await getAllAlarms();

  await Promise.all(
    alarms
      .filter(alarm => {
        return (
          isRuleAlarmName(alarm.name) && !enabledAlarmNames.has(alarm.name)
        );
      })
      .map(alarm => clearAlarm(alarm.name))
  );

  for (const rule of enabledRules) {
    await scheduleRuleAlarm(rule);
  }
}

async function scheduleRuleAlarm(rule) {
  const alarmName = getRuleAlarmName(rule.id);
  const minutes = getCadenceOption(rule.cadence).minutes;
  await clearAlarm(alarmName);
  await createAlarm(alarmName, {
    delayInMinutes: minutes,
    periodInMinutes: minutes,
  });
}

async function onAlarm(alarm) {
  if (!isRuleAlarmName(alarm.name)) {
    return;
  }

  const ruleId = getRuleIdFromAlarmName(alarm.name);
  const rules = await automationStorage.listRules();
  const rule = rules.find(candidate => candidate.id === ruleId);
  if (!rule || rule.enabled === false) {
    await clearAlarm(alarm.name);
    return;
  }

  try {
    const result = await deleteCookiesForRule(browserDetector, rule);
    const status = !result.matchedCount
      ? 'No matching cookies found.'
      : `Removed ${result.removedCount} cookie${result.removedCount === 1 ? '' : 's'}.`;
    await automationStorage.recordRuleRun(rule.id, {
      status: status,
      removedCount: result.removedCount,
    });
  } catch (error) {
    console.error('Scheduled cleanup failed', error);
    await automationStorage.recordRuleRun(rule.id, {
      status: `Failed: ${error.message || 'Unknown error'}`,
      removedCount: 0,
    });
  }
}

async function getAllAlarms() {
  if (browserDetector.supportsPromises()) {
    return api.alarms.getAll();
  }

  return new Promise(resolve => {
    api.alarms.getAll(resolve);
  });
}

async function clearAlarm(name) {
  if (browserDetector.supportsPromises()) {
    return api.alarms.clear(name);
  }

  return new Promise(resolve => {
    api.alarms.clear(name, resolve);
  });
}

async function createAlarm(name, info) {
  if (browserDetector.supportsPromises()) {
    return api.alarms.create(name, info);
  }

  return api.alarms.create(name, info);
}
