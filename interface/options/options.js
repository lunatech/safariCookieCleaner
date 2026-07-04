/* eslint-disable require-jsdoc */

import { AutomationStorage } from '../core/automationStorage.js';
import {
  CleanupCadenceOptions,
  formatCadenceLabel,
} from '../core/cleanupRules.js';
import { CleanupScopes, getScopeLabel } from '../core/urlScope.js';
import { BrowserDetector } from '../lib/browserDetector.js';
import { GenericStorageHandler } from '../lib/genericStorageHandler.js';
import {
  applyTheme,
  getThemePreference,
  setThemePreference,
} from '../lib/themePreference.js';

const browserDetector = new BrowserDetector();
const storageHandler = new GenericStorageHandler(browserDetector);
const automationStorage = new AutomationStorage(storageHandler);

const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  bindEvents();
  await refreshPage();
});

function cacheElements() {
  elements.ruleCount = document.getElementById('rule-count');
  elements.emptyState = document.getElementById('empty-state');
  elements.rulesList = document.getElementById('rules-list');
  elements.themeSelect = document.getElementById('theme-select');
  elements.status = document.getElementById('status');
}

function bindEvents() {
  elements.themeSelect.addEventListener('change', async event => {
    await setThemePreference(storageHandler, event.target.value);
    await refreshTheme();
    showStatus('Theme updated.', 'success');
  });

  browserDetector.getApi().storage.onChanged.addListener(async changes => {
    if (changes.cleanup_rules || changes.theme_preference) {
      await refreshPage();
    }
  });
}

async function refreshPage() {
  await refreshTheme();
  await renderRules();
}

async function refreshTheme() {
  const theme = await getThemePreference(storageHandler);
  elements.themeSelect.value = theme;
  applyTheme(theme);
}

async function renderRules() {
  const rules = await automationStorage.listRules();
  const sortedRules = [...rules].sort((left, right) => {
    return (
      left.target.localeCompare(right.target) ||
      left.scope.localeCompare(right.scope)
    );
  });

  elements.ruleCount.textContent = `${sortedRules.length} rule${sortedRules.length === 1 ? '' : 's'}`;
  elements.emptyState.classList.toggle('hidden', sortedRules.length > 0);
  elements.rulesList.replaceChildren();

  sortedRules.forEach(rule => {
    elements.rulesList.appendChild(buildRuleItem(rule));
  });
}

function buildRuleItem(rule) {
  const item = document.createElement('li');
  item.className = 'rule-item';

  const header = document.createElement('div');
  header.className = 'rule-header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'rule-title-group';

  const title = document.createElement('h3');
  title.textContent = rule.target;
  titleGroup.appendChild(title);

  const badges = document.createElement('div');
  badges.className = 'badges';
  badges.appendChild(buildBadge(getScopeLabel(rule.scope)));
  badges.appendChild(buildBadge(formatCadenceLabel(rule.cadence)));
  if (!rule.enabled) {
    badges.appendChild(buildBadge('Paused'));
  }
  titleGroup.appendChild(badges);
  header.appendChild(titleGroup);

  const removeButton = document.createElement('button');
  removeButton.className = 'danger-button';
  removeButton.type = 'button';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', async () => {
    await automationStorage.removeRule(rule.id);
    showStatus(`Removed ${rule.target}.`, 'success');
  });
  header.appendChild(removeButton);
  item.appendChild(header);

  const description = document.createElement('p');
  description.className = 'rule-description';
  description.textContent =
    rule.scope === CleanupScopes.Site
      ? `Cleans the site-wide scope for ${rule.target}, including subdomains.`
      : `Cleans only cookies scoped to ${rule.target}.`;
  item.appendChild(description);

  const controls = document.createElement('div');
  controls.className = 'rule-controls';

  const cadenceField = document.createElement('label');
  cadenceField.className = 'field';
  const cadenceLabel = document.createElement('span');
  cadenceLabel.textContent = 'Cadence';
  const cadenceSelect = document.createElement('select');
  CleanupCadenceOptions.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.id;
    optionElement.textContent = option.label;
    optionElement.selected = option.id === rule.cadence;
    cadenceSelect.appendChild(optionElement);
  });
  cadenceSelect.addEventListener('change', async event => {
    await automationStorage.updateRule(rule.id, {
      cadence: event.target.value,
    });
    showStatus(
      `Updated ${rule.target} to ${formatCadenceLabel(event.target.value)}.`,
      'success'
    );
  });
  cadenceField.append(cadenceLabel, cadenceSelect);
  controls.appendChild(cadenceField);

  const enabledField = document.createElement('label');
  enabledField.className = 'toggle-row';
  const enabledText = document.createElement('span');
  enabledText.textContent = 'Enabled';
  const enabledCheckbox = document.createElement('input');
  enabledCheckbox.type = 'checkbox';
  enabledCheckbox.checked = rule.enabled !== false;
  enabledCheckbox.addEventListener('change', async event => {
    await automationStorage.updateRule(rule.id, {
      enabled: event.target.checked,
    });
    showStatus(
      `${event.target.checked ? 'Enabled' : 'Paused'} ${rule.target}.`,
      'success'
    );
  });
  enabledField.append(enabledText, enabledCheckbox);
  controls.appendChild(enabledField);

  item.appendChild(controls);

  const lastRun = document.createElement('p');
  lastRun.className = 'last-run';
  lastRun.textContent = formatLastRun(rule);
  item.appendChild(lastRun);

  return item;
}

function buildBadge(text) {
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = text;
  return badge;
}

function formatLastRun(rule) {
  if (!rule.lastRunAt) {
    return 'Last run: not yet recorded.';
  }

  const timestamp = new Date(rule.lastRunAt).toLocaleString();
  const summary = rule.lastRunStatus || 'Completed.';
  return `Last run: ${timestamp}. ${summary}`;
}

function showStatus(message, tone) {
  elements.status.textContent = message;
  elements.status.className = `status ${tone || 'info'}`;
}
