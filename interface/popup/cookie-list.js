/* eslint-disable require-jsdoc */

import { AutomationStorage } from '../core/automationStorage.js';
import {
  CleanupCadences,
  formatCadenceLabel,
  getCadenceOption,
  getRuleAlarmName,
} from '../core/cleanupRules.js';
import {
  deleteCookiesForCurrentTab,
  filterCookiesForManualCleanup,
  getCookiesForCurrentTab,
} from '../core/cookieCleaner.js';
import {
  clearPageStorageForTab,
  scanTabForEvercookies,
} from '../core/evercookieScanner.js';
import { CleanupScopes, getScopeDetails } from '../core/urlScope.js';
import { BrowserDetector } from '../lib/browserDetector.js';
import { GenericStorageHandler } from '../lib/genericStorageHandler.js';
import { PermissionHandler } from '../lib/permissionHandler.js';
import { applyTheme, getThemePreference } from '../lib/themePreference.js';

const browserDetector = new BrowserDetector();
const storageHandler = new GenericStorageHandler(browserDetector);
const automationStorage = new AutomationStorage(storageHandler);
const permissionHandler = new PermissionHandler(browserDetector);

const NEVER = 'never';
const POPUP_CADENCE_OPTIONS = [
  { id: NEVER, label: 'no repeat' },
  { id: CleanupCadences.OneHour, label: '1h' },
  { id: CleanupCadences.SixHours, label: '6h' },
  { id: CleanupCadences.OneDay, label: '1d' },
];
const FOOTER_MESSAGE_TIMEOUT_MS = 2500;

const state = {
  currentTab: null,
  hasPermission: false,
  scopeDetails: { hostname: '', site: '' },
  siteRule: null,
  subdomainRule: null,
  siteCookieCount: null,
  subdomainCookieCount: null,
  evercookieScan: null,
};

const elements = {};
let footerRevertTimer = null;

function logPopupEvent(event, details = {}) {
  console.log('[SafariCookieCleaner][popup]', event, details);
}

document.addEventListener('DOMContentLoaded', async () => {
  logPopupEvent('Popup opened', {
    href: window.location.href,
  });
  cacheElements();
  bindEvents();
  setupSwipe(elements.siteRowContent, CleanupScopes.Site);
  setupSwipe(elements.subdomainRowContent, CleanupScopes.Subdomain);
  await updateTheme();
  watchSystemTheme();
  await loadCurrentTab();
});

function cacheElements() {
  elements.hostnameChip = document.getElementById('hostname-chip');
  elements.subdomainLabel = document.getElementById('subdomain-label');
  elements.siteSub = document.getElementById('site-sub');
  elements.subdomainSub = document.getElementById('subdomain-sub');
  elements.sitePicker = document.getElementById('site-picker');
  elements.subdomainPicker = document.getElementById('subdomain-picker');
  elements.siteClear = document.getElementById('delete-site');
  elements.subdomainClear = document.getElementById('delete-subdomain');
  elements.siteTapClear = document.getElementById('site-tap-clear');
  elements.subdomainTapClear = document.getElementById('subdomain-tap-clear');
  elements.siteRowContent = document.getElementById('site-row-content');
  elements.subdomainRowContent = document.getElementById(
    'subdomain-row-content'
  );
  elements.permissionCard = document.getElementById('permission-card');
  elements.requestPermission = document.getElementById('request-permission');
  elements.evercookieCard = document.getElementById('evercookie-card');
  elements.evercookieSummary = document.getElementById('evercookie-summary');
  elements.evercookieWarning = document.getElementById('evercookie-warning');
  elements.evercookieClear = document.getElementById('evercookie-clear');
  elements.manageAutomation = document.getElementById('manage-automation');
  elements.footer = document.getElementById('status-footer');
}

function bindEvents() {
  elements.requestPermission.addEventListener('click', async () => {
    if (!state.currentTab) {
      return;
    }

    logPopupEvent('Request permission clicked', {
      currentTabUrl: state.currentTab.url,
    });
    const granted = await permissionHandler.requestPermission(
      state.currentTab.url
    );
    if (!granted) {
      showTransientFooter('Safari kept access unchanged.');
      return;
    }

    showTransientFooter('Site access granted.');
    await refreshPermissionsAndRules();
  });

  elements.siteClear.addEventListener('click', async () => {
    logPopupEvent('Clear site clicked', {
      currentTabUrl: state.currentTab?.url,
    });
    await runManualCleanup(CleanupScopes.Site);
  });

  elements.subdomainClear.addEventListener('click', async () => {
    logPopupEvent('Clear subdomain clicked', {
      currentTabUrl: state.currentTab?.url,
    });
    await runManualCleanup(CleanupScopes.Subdomain);
  });

  elements.siteTapClear.addEventListener('click', async () => {
    logPopupEvent('Clear site tap-icon clicked', {
      currentTabUrl: state.currentTab?.url,
    });
    await runManualCleanup(CleanupScopes.Site);
  });

  elements.subdomainTapClear.addEventListener('click', async () => {
    logPopupEvent('Clear subdomain tap-icon clicked', {
      currentTabUrl: state.currentTab?.url,
    });
    await runManualCleanup(CleanupScopes.Subdomain);
  });

  elements.evercookieClear.addEventListener('click', async () => {
    logPopupEvent('Clear evercookie data clicked', {
      currentTabUrl: state.currentTab?.url,
    });
    await runManualCleanup(CleanupScopes.Site, true);
  });

  elements.sitePicker.addEventListener('change', async () => {
    logPopupEvent('Site repeat picker changed', {
      currentTabUrl: state.currentTab?.url,
      value: elements.sitePicker.value,
    });
    await handlePickerChange(CleanupScopes.Site, elements.sitePicker);
  });

  elements.subdomainPicker.addEventListener('change', async () => {
    logPopupEvent('Subdomain repeat picker changed', {
      currentTabUrl: state.currentTab?.url,
      value: elements.subdomainPicker.value,
    });
    await handlePickerChange(CleanupScopes.Subdomain, elements.subdomainPicker);
  });

  elements.manageAutomation.addEventListener('click', async () => {
    logPopupEvent('Manage automation clicked');
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
    logPopupEvent('Resolved current tab', {
      currentTab: state.currentTab,
    });
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
    logPopupEvent('Computed scope details', {
      scopeDetails: state.scopeDetails,
    });
    elements.hostnameChip.textContent = state.scopeDetails.hostname;
    elements.subdomainLabel.textContent = subdomainLabelFor(state.scopeDetails);
    await refreshPermissionsAndRules();
  } catch (error) {
    console.error('Failed to load the current tab', error);
    showUnsupportedState('Safari did not provide an active website.');
  }
}

function subdomainLabelFor({ hostname, site }) {
  if (!hostname || !site || hostname === site) {
    return 'Subdomain';
  }
  const suffix = `.${site}`;
  if (!hostname.endsWith(suffix)) {
    return 'Subdomain';
  }
  return `Subdomain · ${hostname.slice(0, -suffix.length)}`;
}

async function refreshPermissionsAndRules() {
  if (!state.currentTab) {
    return;
  }

  state.hasPermission = await permissionHandler.checkPermissions(
    state.currentTab.url
  );
  logPopupEvent('Permission check completed', {
    currentTabUrl: state.currentTab.url,
    hasPermission: state.hasPermission,
  });
  elements.permissionCard.classList.toggle('hidden', state.hasPermission);
  setRowsDisabled(!state.hasPermission);

  if (!state.hasPermission) {
    state.siteRule = null;
    state.subdomainRule = null;
    state.siteCookieCount = null;
    state.subdomainCookieCount = null;
    state.evercookieScan = null;
    renderRows();
    renderEvercookieCard();
    elements.footer.textContent = 'Grant site access to manage cookies here.';
    return;
  }

  await refreshRules();
  await refreshCookieCounts();
  await refreshEvercookieScan();
  renderRows();
  renderEvercookieCard();
  await refreshFooter();
}

async function refreshRules() {
  const rules = await automationStorage.listRules();
  state.siteRule =
    rules.find(
      rule =>
        rule.scope === CleanupScopes.Site &&
        rule.target === state.scopeDetails.site
    ) || null;
  state.subdomainRule =
    rules.find(
      rule =>
        rule.scope === CleanupScopes.Subdomain &&
        rule.target === state.scopeDetails.hostname
    ) || null;
}

async function refreshCookieCounts() {
  if (!state.currentTab || !state.hasPermission) {
    return;
  }

  const cookies = await getCookiesForCurrentTab(
    browserDetector,
    state.currentTab,
    'popup cookie count'
  );
  const subdomainCookies = filterCookiesForManualCleanup(
    cookies,
    state.currentTab.url,
    CleanupScopes.Subdomain
  );
  logPopupEvent('Cookie counts refreshed', {
    currentTabUrl: state.currentTab.url,
    siteCount: cookies.length,
    subdomainCount: subdomainCookies.length,
  });
  state.siteCookieCount = cookies.length;
  state.subdomainCookieCount = subdomainCookies.length;
}

function formatCookieCount(count) {
  return `${count} cookie${count === 1 ? '' : 's'}`;
}

async function refreshEvercookieScan() {
  if (!state.currentTab || !state.hasPermission) {
    return;
  }

  if (!browserDetector.getApi().scripting?.executeScript) {
    logPopupEvent('Evercookie scan skipped', {
      reason: 'scripting API unavailable',
    });
    state.evercookieScan = { supported: false };
    return;
  }

  try {
    const scan = await scanTabForEvercookies(browserDetector, state.currentTab);
    logPopupEvent('Evercookie scan completed', {
      currentTabUrl: state.currentTab.url,
      populatedMechanisms: scan.populatedMechanisms,
      respawnSignalCount: scan.respawnSignals.length,
    });
    state.evercookieScan = { supported: true, ...scan };
  } catch (error) {
    console.error('Evercookie scan failed', error);
    logPopupEvent('Evercookie scan failed', {
      currentTabUrl: state.currentTab.url,
      error: error.message || String(error),
    });
    state.evercookieScan = { supported: true, failed: true };
  }
}

function renderEvercookieCard() {
  if (!state.hasPermission || !state.evercookieScan) {
    elements.evercookieCard.classList.add('hidden');
    return;
  }

  elements.evercookieCard.classList.remove('hidden');
  elements.evercookieWarning.classList.add('hidden');

  if (!state.evercookieScan.supported) {
    elements.evercookieSummary.textContent =
      "This browser can't check for hidden site data yet.";
    setEvercookieClearAvailable(false);
    return;
  }

  if (state.evercookieScan.failed) {
    elements.evercookieSummary.textContent =
      'Could not check hidden site data on this page.';
    setEvercookieClearAvailable(false);
    return;
  }

  setEvercookieClearAvailable(true);

  const duplicateIdentifierCount = state.evercookieScan.respawnSignals.length;
  elements.evercookieSummary.textContent = duplicateIdentifierCount
    ? `${duplicateIdentifierCount} tracking identifier${duplicateIdentifierCount === 1 ? '' : 's'} found in more than one storage location.`
    : 'No duplicated tracking identifiers found.';

  if (duplicateIdentifierCount) {
    elements.evercookieWarning.textContent =
      'These are not additional cookies. They are copies stored elsewhere that may recreate a deleted cookie.';
    elements.evercookieWarning.classList.remove('hidden');
  }
}

function setEvercookieClearAvailable(available) {
  elements.evercookieClear.disabled = !available;
}

function formatRepeatLabel(cadenceId) {
  if (!cadenceId || cadenceId === NEVER) {
    return 'no repeat';
  }
  const option = POPUP_CADENCE_OPTIONS.find(
    candidate => candidate.id === cadenceId
  );
  return option ? option.label : formatCadenceLabel(cadenceId);
}

/**
 * Ensures the picker has a selectable <option> for a rule's cadence even
 * when it falls outside the popup's curated Never/1h/6h/1d set (e.g. a
 * pre-existing 1m/15m rule created via the options page). Without this, the
 * <select> would silently fail to reflect the saved cadence, and any
 * incidental interaction with it could overwrite a valid rule.
 * @param {HTMLSelectElement} picker
 * @param {?string} cadenceId
 */
function ensurePickerOption(picker, cadenceId) {
  if (!cadenceId || picker.querySelector(`option[value="${cadenceId}"]`)) {
    return;
  }
  const option = document.createElement('option');
  option.value = cadenceId;
  option.textContent = formatCadenceLabel(cadenceId);
  picker.appendChild(option);
}

function renderRows() {
  const { site, hostname } = state.scopeDetails;

  elements.siteSub.textContent =
    state.siteCookieCount === null
      ? '—'
      : `${formatCookieCount(state.siteCookieCount)} · ${formatRepeatLabel(state.siteRule?.cadence)}`;
  elements.subdomainSub.textContent =
    state.subdomainCookieCount === null
      ? '—'
      : `${formatCookieCount(state.subdomainCookieCount)} · ${formatRepeatLabel(state.subdomainRule?.cadence)}`;

  ensurePickerOption(elements.sitePicker, state.siteRule?.cadence);
  ensurePickerOption(elements.subdomainPicker, state.subdomainRule?.cadence);
  elements.sitePicker.value = state.siteRule ? state.siteRule.cadence : NEVER;
  elements.subdomainPicker.value = state.subdomainRule
    ? state.subdomainRule.cadence
    : NEVER;

  elements.siteClear.setAttribute(
    'aria-label',
    `Clear cookies for ${site || 'this site'}`
  );
  elements.subdomainClear.setAttribute(
    'aria-label',
    `Clear cookies for ${hostname || 'this subdomain'}`
  );
  elements.siteTapClear.setAttribute(
    'aria-label',
    `Clear cookies for ${site || 'this site'}`
  );
  elements.subdomainTapClear.setAttribute(
    'aria-label',
    `Clear cookies for ${hostname || 'this subdomain'}`
  );
  elements.sitePicker.setAttribute(
    'aria-label',
    `Repeat cleanup for ${site || 'this site'}`
  );
  elements.subdomainPicker.setAttribute(
    'aria-label',
    `Repeat cleanup for ${hostname || 'this subdomain'}`
  );
}

async function handlePickerChange(scope, picker) {
  if (!state.currentTab || !state.hasPermission) {
    return;
  }

  const value = picker.value;
  const existingRule =
    scope === CleanupScopes.Site ? state.siteRule : state.subdomainRule;

  if (value === NEVER) {
    if (existingRule) {
      await automationStorage.removeRule(existingRule.id);
    }
  } else {
    await automationStorage.upsertRule(state.currentTab.url, scope, value);
  }

  await refreshRules();
  renderRows();
  await refreshFooter();
}

async function runManualCleanup(scope, clearPageStorage = false) {
  if (!state.currentTab || !state.hasPermission) {
    return;
  }

  const alsoClearStorage = clearPageStorage;

  logPopupEvent('Manual cleanup starting', {
    scope: scope,
    currentTabUrl: state.currentTab.url,
    hasPermission: state.hasPermission,
    alsoClearStorage: alsoClearStorage,
  });
  const buttons = clearPageStorage
    ? [elements.evercookieClear]
    : scope === CleanupScopes.Site
      ? [elements.siteClear, elements.siteTapClear]
      : [elements.subdomainClear, elements.subdomainTapClear];
  await withBusy(buttons, async () => {
    const result = await deleteCookiesForCurrentTab(
      browserDetector,
      state.currentTab,
      scope
    );

    let clearedStorage = false;
    if (alsoClearStorage) {
      try {
        await clearPageStorageForTab(browserDetector, state.currentTab);
        clearedStorage = true;
      } catch (error) {
        console.error('Failed to clear extra page data', error);
        logPopupEvent('Manual storage clear failed', {
          currentTabUrl: state.currentTab.url,
          error: error.message || String(error),
        });
      }
    }

    logPopupEvent('Manual cleanup finished', {
      scope: scope,
      currentTabUrl: state.currentTab.url,
      matchedCount: result.matchedCount,
      removedCount: result.removedCount,
      clearedStorage: clearedStorage,
    });
    await refreshCookieCounts();
    await refreshEvercookieScan();
    renderRows();
    renderEvercookieCard();

    const label = scope === CleanupScopes.Site ? 'site' : 'subdomain';
    const cookieMessage = result.matchedCount
      ? `Removed ${result.removedCount} cookie${result.removedCount === 1 ? '' : 's'} for the ${label}.`
      : `No cookies matched the ${label}.`;
    showTransientFooter(
      clearedStorage
        ? `${cookieMessage} Also cleared extra data on this page.`
        : cookieMessage
    );
  });
  closeSwipedRow(scope);
}

async function refreshFooter() {
  if (!state.hasPermission) {
    return;
  }

  const activeRules = [state.siteRule, state.subdomainRule].filter(Boolean);
  if (!activeRules.length) {
    elements.footer.textContent =
      'Automatic clearing is off — clear anytime above.';
    return;
  }

  const scheduledTimes = (
    await Promise.all(activeRules.map(getScheduledTime))
  ).filter(time => Number.isFinite(time));
  if (!scheduledTimes.length) {
    elements.footer.textContent = 'Automatic clearing is scheduled.';
    return;
  }

  const soonest = Math.min(...scheduledTimes);
  const duration = formatDuration(soonest - Date.now());
  elements.footer.textContent = `Next automatic run for this site in ${duration}.`;
}

async function getScheduledTime(rule) {
  const api = browserDetector.getApi();
  if (api.alarms?.get) {
    try {
      const alarmName = getRuleAlarmName(rule.id);
      const alarm = browserDetector.supportsPromises()
        ? await api.alarms.get(alarmName)
        : await new Promise(resolve => api.alarms.get(alarmName, resolve));
      if (alarm?.scheduledTime) {
        return alarm.scheduledTime;
      }
    } catch (error) {
      console.error('Failed to read scheduled alarm time', error);
    }
  }

  const minutes = getCadenceOption(rule.cadence).minutes;
  const reference = rule.lastRunAt || rule.updatedAt || rule.createdAt;
  const referenceMs = reference ? new Date(reference).getTime() : Date.now();
  return referenceMs + minutes * 60 * 1000;
}

function formatDuration(milliseconds) {
  const totalMinutes = Math.max(1, Math.round(milliseconds / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  }
  const totalHours = Math.round(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours} hour${totalHours === 1 ? '' : 's'}`;
  }
  const totalDays = Math.round(totalHours / 24);
  return `${totalDays} day${totalDays === 1 ? '' : 's'}`;
}

function showTransientFooter(message) {
  elements.footer.textContent = message;
  clearTimeout(footerRevertTimer);
  footerRevertTimer = setTimeout(() => {
    footerRevertTimer = null;
    refreshFooter();
  }, FOOTER_MESSAGE_TIMEOUT_MS);
}

/**
 * Wires touch swipe-to-clear on a row's content element. The row's Clear
 * button sits behind the content in document order and stays a real,
 * focusable <button> at all times (only visually clipped by the row's
 * `overflow: hidden`, never `display`/`visibility` hidden), so it remains
 * reachable by keyboard and VoiceOver even when not swiped open.
 * @param {HTMLElement} rowContent
 * @param {string} scope
 */
function setupSwipe(rowContent, scope) {
  const openX = -84;
  const openThreshold = -40;
  const moveThreshold = 4;
  let startX = 0;
  let baseX = 0;
  let lastX = 0;
  let dragging = false;
  let moved = false;

  const isOpen = () => rowContent.classList.contains('swiped');
  const setOpen = open => {
    rowContent.classList.toggle('swiped', open);
    if (open) {
      closeOtherSwipedRows(scope);
    }
  };

  rowContent.addEventListener(
    'touchstart',
    event => {
      if (event.touches.length !== 1) {
        return;
      }
      dragging = true;
      moved = false;
      startX = event.touches[0].clientX;
      baseX = isOpen() ? openX : 0;
      rowContent.style.transition = 'none';
    },
    { passive: true }
  );

  rowContent.addEventListener(
    'touchmove',
    event => {
      if (!dragging) {
        return;
      }
      const delta = event.touches[0].clientX - startX;
      if (Math.abs(delta) > moveThreshold) {
        moved = true;
      }
      lastX = Math.min(0, Math.max(openX, baseX + delta));
      rowContent.style.transform = `translateX(${lastX}px)`;
    },
    { passive: true }
  );

  rowContent.addEventListener('touchend', () => {
    if (!dragging) {
      return;
    }
    dragging = false;
    rowContent.style.transition = '';
    rowContent.style.transform = '';
    if (!moved) {
      if (isOpen()) {
        setOpen(false);
      }
      return;
    }
    setOpen(lastX <= openThreshold);
  });

  rowContent.addEventListener('touchcancel', () => {
    dragging = false;
    rowContent.style.transition = '';
    rowContent.style.transform = '';
  });
}

function closeOtherSwipedRows(exceptScope) {
  if (exceptScope !== CleanupScopes.Site) {
    elements.siteRowContent.classList.remove('swiped');
  }
  if (exceptScope !== CleanupScopes.Subdomain) {
    elements.subdomainRowContent.classList.remove('swiped');
  }
}

function closeSwipedRow(scope) {
  const rowContent =
    scope === CleanupScopes.Site
      ? elements.siteRowContent
      : elements.subdomainRowContent;
  rowContent.classList.remove('swiped');
}

async function withBusy(buttons, work) {
  const originalLabel = buttons[0].textContent;
  logPopupEvent('Busy action started', {
    buttonLabel: originalLabel,
  });
  buttons.forEach(button => {
    button.disabled = true;
  });
  try {
    await work();
  } catch (error) {
    console.error('Action failed', error);
    logPopupEvent('Busy action failed', {
      buttonLabel: originalLabel,
      error: error.message || String(error),
    });
    showTransientFooter(error.message || 'That action failed.');
  } finally {
    buttons.forEach(button => {
      button.disabled = false;
    });
    logPopupEvent('Busy action finished', {
      buttonLabel: originalLabel,
    });
  }
}

function setRowsDisabled(disabled) {
  elements.siteClear.disabled = disabled;
  elements.subdomainClear.disabled = disabled;
  elements.siteTapClear.disabled = disabled;
  elements.subdomainTapClear.disabled = disabled;
  elements.sitePicker.disabled = disabled;
  elements.subdomainPicker.disabled = disabled;
}

function showUnsupportedState(message) {
  logPopupEvent('Unsupported popup state', {
    message: message,
  });
  elements.hostnameChip.textContent = 'Unavailable';
  elements.subdomainLabel.textContent = 'Subdomain';
  state.siteCookieCount = null;
  state.subdomainCookieCount = null;
  state.siteRule = null;
  state.subdomainRule = null;
  state.evercookieScan = null;
  renderRows();
  renderEvercookieCard();
  elements.footer.textContent = message;
  elements.permissionCard.classList.add('hidden');
  setRowsDisabled(true);
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
