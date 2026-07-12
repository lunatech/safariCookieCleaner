/* eslint-disable require-jsdoc */
/* global cookieStore */

const LOG_PREFIX = '[SafariCookieCleaner][evercookieScanner]';

// Values shorter than this are almost always flags, booleans, or counters
// rather than tracking identifiers, so treating them as duplicates would
// produce mostly false positives.
const MIN_DUPLICATE_VALUE_LENGTH = 8;

export const StorageMechanisms = Object.freeze({
  Cookies: 'cookies',
  LocalStorage: 'localStorage',
  SessionStorage: 'sessionStorage',
  WindowName: 'windowName',
  CookieStore: 'cookieStore',
  IndexedDB: 'indexedDB',
  CacheAPI: 'cacheAPI',
});

/**
 * Runs inside the inspected page, injected via chrome.scripting.executeScript.
 * Must stay fully self-contained: executeScript serializes this function and
 * re-executes it in the page's world, so it cannot close over anything from
 * this module's scope.
 * @return {Promise<object>}
 */
export async function collectPageStorage() {
  const stores = {};

  stores.cookies = Object.fromEntries(
    document.cookie
      .split('; ')
      .filter(Boolean)
      .map(pair => {
        const i = pair.indexOf('=');
        return [pair.slice(0, i), pair.slice(i + 1)];
      })
  );

  stores.localStorage = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    stores.localStorage[key] = localStorage.getItem(key);
  }

  stores.sessionStorage = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    stores.sessionStorage[key] = sessionStorage.getItem(key);
  }

  if (window.name) {
    stores.windowName = window.name;
  }

  if (typeof cookieStore !== 'undefined') {
    try {
      const all = await cookieStore.getAll();
      stores.cookieStore = Object.fromEntries(
        all.map(cookie => [cookie.name, cookie.value])
      );
    } catch (error) {
      stores.cookieStoreError = error.message;
    }
  }

  if (
    typeof indexedDB !== 'undefined' &&
    typeof indexedDB.databases === 'function'
  ) {
    try {
      stores.indexedDbDatabases = (await indexedDB.databases()).map(
        db => db.name
      );
    } catch (error) {
      stores.indexedDbError = error.message;
    }
  }

  if (typeof caches !== 'undefined') {
    try {
      stores.cacheNames = await caches.keys();
    } catch (error) {
      stores.cacheStorageError = error.message;
    }
  }

  return stores;
}

/**
 * Cross-references values across storage mechanisms to find the respawn
 * signature an evercookie leaves behind: the same identifier written to more
 * than one store.
 * @param {object} stores Output of collectPageStorage().
 * @return {Array<{value: string, locations: string[]}>}
 */
export function detectRespawnSignals(stores) {
  const seen = new Map();

  const record = (mechanism, key, value) => {
    if (
      typeof value !== 'string' ||
      value.length < MIN_DUPLICATE_VALUE_LENGTH
    ) {
      return;
    }
    const locations = seen.get(value) || [];
    locations.push(`${mechanism}.${key}`);
    seen.set(value, locations);
  };

  Object.entries(stores.cookies || {}).forEach(([key, value]) =>
    record(StorageMechanisms.Cookies, key, value)
  );
  Object.entries(stores.localStorage || {}).forEach(([key, value]) =>
    record(StorageMechanisms.LocalStorage, key, value)
  );
  Object.entries(stores.sessionStorage || {}).forEach(([key, value]) =>
    record(StorageMechanisms.SessionStorage, key, value)
  );
  Object.entries(stores.cookieStore || {}).forEach(([key, value]) =>
    record(StorageMechanisms.CookieStore, key, value)
  );
  if (stores.windowName) {
    record(StorageMechanisms.WindowName, 'name', stores.windowName);
  }

  return Array.from(seen.entries())
    .filter(([, locations]) => locations.length > 1)
    .map(([value, locations]) => ({ value, locations }));
}

/**
 * Lists which storage mechanisms hold any data at all, independent of
 * whether a cross-store duplicate was found.
 * @param {object} stores Output of collectPageStorage().
 * @return {string[]}
 */
export function listPopulatedMechanisms(stores) {
  const populated = [];
  if (Object.keys(stores.cookies || {}).length) {
    populated.push(StorageMechanisms.Cookies);
  }
  if (Object.keys(stores.localStorage || {}).length) {
    populated.push(StorageMechanisms.LocalStorage);
  }
  if (Object.keys(stores.sessionStorage || {}).length) {
    populated.push(StorageMechanisms.SessionStorage);
  }
  if (stores.windowName) {
    populated.push(StorageMechanisms.WindowName);
  }
  if (Object.keys(stores.cookieStore || {}).length) {
    populated.push(StorageMechanisms.CookieStore);
  }
  if ((stores.indexedDbDatabases || []).length) {
    populated.push(StorageMechanisms.IndexedDB);
  }
  if ((stores.cacheNames || []).length) {
    populated.push(StorageMechanisms.CacheAPI);
  }
  return populated;
}

function getApi(browserDetector) {
  return browserDetector.getApi();
}

/**
 * Injects collectPageStorage into the given tab and returns the combined
 * scan result. Requires the "scripting" permission plus an existing host
 * permission grant for the tab's origin — the same per-site grant already
 * required elsewhere in this codebase before touching the cookies API.
 * @param {BrowserDetector} browserDetector
 * @param {object} tab
 * @return {Promise<{stores: object, populatedMechanisms: string[], respawnSignals: Array}>}
 */
export async function scanTabForEvercookies(browserDetector, tab) {
  const api = getApi(browserDetector);
  console.log(`${LOG_PREFIX} Starting scan`, { tabId: tab.id, url: tab.url });

  if (!api.scripting?.executeScript) {
    console.log(`${LOG_PREFIX} scripting API unavailable; skipping scan`, {
      tabId: tab.id,
    });
    return { stores: {}, populatedMechanisms: [], respawnSignals: [] };
  }

  const [injectionResult] = await api.scripting.executeScript({
    target: { tabId: tab.id },
    func: collectPageStorage,
  });

  const stores = injectionResult?.result || {};
  const populatedMechanisms = listPopulatedMechanisms(stores);
  const respawnSignals = detectRespawnSignals(stores);

  console.log(`${LOG_PREFIX} Scan complete`, {
    tabId: tab.id,
    url: tab.url,
    populatedMechanisms: populatedMechanisms,
    respawnSignalCount: respawnSignals.length,
  });

  return { stores, populatedMechanisms, respawnSignals };
}
