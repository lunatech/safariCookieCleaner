/* eslint-disable require-jsdoc */

import { AutomationStorage } from '../core/automationStorage.js';
import { CleanupCadences, formatCadenceLabel } from '../core/cleanupRules.js';
import { deleteCookiesForCurrentTab } from '../core/cookieCleaner.js';
import { CleanupScopes, getScopeDetails } from '../core/urlScope.js';
import { BrowserDetector } from '../lib/browserDetector.js';
import { GenericStorageHandler } from '../lib/genericStorageHandler.js';
import { PermissionHandler } from '../lib/permissionHandler.js';
import { applyTheme, getThemePreference } from '../lib/themePreference.js';

const browserDetector = new BrowserDetector();
const storageHandler = new GenericStorageHandler(browserDetector);
const automationStorage = new AutomationStorage(storageHandler);
const permissionHandler = new PermissionHandler(browserDetector);

const state = {
  currentTab: null,
  scopeDetails: null,
  hasPermission: false,
};

const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  bindEvents();
  await updateTheme();
  watchSystemTheme();
  await loadCurrentTab();
});

function cacheElements() {
  elements.currentSiteHeading = document.getElementById('current-site-heading');
  elements.hostnameChip = document.getElementById('hostname-chip');
  elements.siteTarget = document.getElementById('site-target');
  elements.siteNote = document.getElementById('site-note');
  elements.subdomainTarget = document.getElementById('subdomain-target');
  elements.subdomainNote = document.getElementById('subdomain-note');
  elements.siteRuleStatus = document.getElementById('site-rule-status');
  elements.subdomainRuleStatus = document.getElementById(
    'subdomain-rule-status'
  );
  elements.permissionCard = document.getElementById('permission-card');
  elements.requestPermission = document.getElementById('request-permission');
  elements.cadence = document.getElementById('cadence');
  elements.deleteSite = document.getElementById('delete-site');
  elements.deleteSubdomain = document.getElementById('delete-subdomain');
  elements.autoSite = document.getElementById('auto-site');
  elements.autoSubdomain = document.getElementById('auto-subdomain');
  elements.manageAutomation = document.getElementById('manage-automation');
  elements.status = document.getElementById('status');
}

function bindEvents() {
  elements.requestPermission.addEventListener('click', async () => {
    if (!state.currentTab) {
      return;
    }

    const granted = await permissionHandler.requestPermission(
      state.currentTab.url
    );
    if (!granted) {
      showStatus('Safari kept access unchanged.', 'warning');
      return;
    }

    showStatus('Site access granted.', 'success');
    await refreshPermissionsAndRules();
  });

  elements.deleteSite.addEventListener('click', async () => {
    await runManualCleanup(CleanupScopes.Site);
  });

  elements.deleteSubdomain.addEventListener('click', async () => {
    await runManualCleanup(CleanupScopes.Subdomain);
  });

  elements.autoSite.addEventListener('click', async () => {
    await saveRule(CleanupScopes.Site);
  });

  elements.autoSubdomain.addEventListener('click', async () => {
    await saveRule(CleanupScopes.Subdomain);
  });

  elements.manageAutomation.addEventListener('click', async () => {
    await browserDetector.getApi().runtime.openOptionsPage();
  });
}

async function updateTheme() {
  const selectedTheme = await getThemePreference(storageHandler);
  applyTheme(selectedTheme);
}

function watchSystemTheme() {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', async () => {
      await updateTheme();
    });
}

async function loadCurrentTab() {
  try {
    state.currentTab = await getCurrentTab();
    if (!state.currentTab || !state.currentTab.url) {
      showUnsupportedState('Open a website in Safari to clean its cookies.');
      return;
    }
    if (!permissionHandler.canHavePermissions(state.currentTab.url)) {
      showUnsupportedState(
        'Safari Cookie Cleaner works on regular websites, not internal Safari pages.'
      );
      return;
    }

    state.scopeDetails = getScopeDetails(state.currentTab.url);
    renderScopeDetails();
    await refreshPermissionsAndRules();
  } catch (error) {
    console.error('Failed to load the current tab', error);
    showUnsupportedState('Safari did not provide an active website.');
  }
}

async function refreshPermissionsAndRules() {
  if (!state.currentTab) {
    return;
  }

  state.hasPermission = await permissionHandler.checkPermissions(
    state.currentTab.url
  );
  elements.permissionCard.classList.toggle('hidden', state.hasPermission);
  setActionButtonsDisabled(!state.hasPermission);

  if (!state.hasPermission) {
    elements.siteRuleStatus.textContent =
      'Grant site access to clean cookies here.';
    elements.subdomainRuleStatus.textContent =
      'Grant site access to save automation for this hostname.';
    return;
  }

  await refreshRuleStatus();
}

function renderScopeDetails() {
  const { hostname, site } = state.scopeDetails;
  elements.currentSiteHeading.textContent = hostname;
  elements.hostnameChip.textContent = hostname;
  elements.siteTarget.textContent = site;
  if (hostname === site) {
    elements.siteNote.textContent =
      'Deletes cookies Safari sends to this site right now.';
  } else {
    elements.siteNote.textContent = `Deletes cookies Safari sends to ${hostname}, including parent-domain cookies from ${site}.`;
  }
  elements.subdomainTarget.textContent = hostname;
  elements.subdomainNote.textContent = `Deletes only cookies scoped to ${hostname}. Broader ${site} cookies stay in place when possible.`;
}

async function refreshRuleStatus() {
  const rules = await automationStorage.listRules();
  const siteRule = rules.find(rule => {
    return (
      rule.scope === CleanupScopes.Site &&
      rule.target === state.scopeDetails.site
    );
  });
  const subdomainRule = rules.find(rule => {
    return (
      rule.scope === CleanupScopes.Subdomain &&
      rule.target === state.scopeDetails.hostname
    );
  });

  elements.siteRuleStatus.textContent = siteRule
    ? describeRule(siteRule)
    : 'No auto-delete rule saved.';
  elements.subdomainRuleStatus.textContent = subdomainRule
    ? describeRule(subdomainRule)
    : 'No auto-delete rule saved.';
}

function describeRule(rule) {
  const prefix = rule.enabled ? 'Auto-delete' : 'Paused';
  return `${prefix} every ${formatCadenceLabel(rule.cadence)}.`;
}

async function runManualCleanup(scope) {
  if (!state.currentTab || !state.hasPermission) {
    return;
  }

  const button =
    scope === CleanupScopes.Site
      ? elements.deleteSite
      : elements.deleteSubdomain;
  await withBusy(button, async () => {
    const result = await deleteCookiesForCurrentTab(
      browserDetector,
      state.currentTab,
      scope
    );

    if (!result.matchedCount) {
      showStatus(
        scope === CleanupScopes.Site
          ? 'No cookies matched the current site.'
          : 'No cookies were scoped only to this subdomain.',
        'warning'
      );
      return;
    }

    const label = scope === CleanupScopes.Site ? 'current site' : 'subdomain';
    showStatus(
      `Removed ${result.removedCount} cookie${result.removedCount === 1 ? '' : 's'} for the ${label}.`,
      'success'
    );
  });
}

async function saveRule(scope) {
  if (!state.currentTab || !state.hasPermission) {
    return;
  }

  const button =
    scope === CleanupScopes.Site ? elements.autoSite : elements.autoSubdomain;
  await withBusy(button, async () => {
    const rule = await automationStorage.upsertRule(
      state.currentTab.url,
      scope,
      elements.cadence.value || CleanupCadences.OneHour
    );
    await refreshRuleStatus();
    showStatus(
      `${scope === CleanupScopes.Site ? 'Site' : 'Subdomain'} cleanup saved for every ${formatCadenceLabel(rule.cadence)}.`,
      'success'
    );
  });
}

async function withBusy(button, work) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Working…';
  try {
    await work();
  } catch (error) {
    console.error('Action failed', error);
    showStatus(error.message || 'That action failed.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function setActionButtonsDisabled(disabled) {
  elements.deleteSite.disabled = disabled;
  elements.deleteSubdomain.disabled = disabled;
  elements.autoSite.disabled = disabled;
  elements.autoSubdomain.disabled = disabled;
}

function showUnsupportedState(message) {
  elements.currentSiteHeading.textContent = 'No website available';
  elements.hostnameChip.textContent = 'Unavailable';
  elements.siteTarget.textContent = '—';
  elements.subdomainTarget.textContent = '—';
  elements.siteNote.textContent = message;
  elements.subdomainNote.textContent = message;
  elements.siteRuleStatus.textContent = 'Open a website to continue.';
  elements.subdomainRuleStatus.textContent = 'Open a website to continue.';
  elements.permissionCard.classList.add('hidden');
  setActionButtonsDisabled(true);
}

function showStatus(message, tone) {
  elements.status.textContent = message;
  elements.status.className = `status ${tone || 'info'}`;
}

async function getCurrentTab() {
  const api = browserDetector.getApi();
  if (browserDetector.supportsPromises()) {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  return new Promise(resolve => {
    api.tabs.query({ active: true, currentWindow: true }, tabs => {
      resolve((tabs && tabs[0]) || null);
    });
  });
}
