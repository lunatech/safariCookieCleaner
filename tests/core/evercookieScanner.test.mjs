/* eslint-disable require-jsdoc */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectRespawnSignals,
  listPopulatedMechanisms,
  scanTabForEvercookies,
  StorageMechanisms,
} from '../../interface/core/evercookieScanner.js';

test('reports no signal when stores hold only distinct values', () => {
  const stores = {
    cookies: { a: 'abcdef1234567890' },
    localStorage: { b: '0987654321fedcba' },
  };
  assert.deepEqual(detectRespawnSignals(stores), []);
});

test('flags a respawn signal when the same id appears in multiple stores', () => {
  const stores = {
    cookies: { uid: 'abcdef1234567890' },
    localStorage: { backupUid: 'abcdef1234567890' },
    sessionStorage: {},
  };

  const signals = detectRespawnSignals(stores);

  assert.equal(signals.length, 1);
  assert.equal(signals[0].value, 'abcdef1234567890');
  assert.deepEqual(signals[0].locations.sort(), [
    'cookies.uid',
    'localStorage.backupUid',
  ]);
});

test('ignores short values below the duplicate-detection floor', () => {
  const stores = {
    cookies: { flag: 'yes' },
    localStorage: { flag2: 'yes' },
  };
  assert.deepEqual(detectRespawnSignals(stores), []);
});

test('detects duplicates spanning window.name and cookieStore', () => {
  const stores = {
    windowName: 'trackingid1234567890',
    cookieStore: { id: 'trackingid1234567890' },
  };

  const signals = detectRespawnSignals(stores);

  assert.equal(signals.length, 1);
  assert.deepEqual(signals[0].locations.sort(), [
    'cookieStore.id',
    'windowName.name',
  ]);
});

test('lists only mechanisms that actually hold data', () => {
  const stores = {
    cookies: { a: '1' },
    localStorage: {},
    windowName: 'tracking-id',
    indexedDbDatabases: ['trackerDb'],
  };

  assert.deepEqual(listPopulatedMechanisms(stores), [
    StorageMechanisms.Cookies,
    StorageMechanisms.WindowName,
    StorageMechanisms.IndexedDB,
  ]);
});

test('reports no populated mechanisms for an empty scan', () => {
  assert.deepEqual(listPopulatedMechanisms({}), []);
});

class FakeBrowserDetector {
  constructor(executeScriptResult) {
    this.executeScriptResult = executeScriptResult;
  }

  getApi() {
    return {
      scripting: {
        executeScript: async () => [{ result: this.executeScriptResult }],
      },
    };
  }
}

test('scans a tab and reports populated mechanisms plus respawn signals', async () => {
  const browserDetector = new FakeBrowserDetector({
    cookies: { uid: 'abcdef1234567890' },
    localStorage: { backupUid: 'abcdef1234567890' },
  });

  const result = await scanTabForEvercookies(browserDetector, {
    id: 1,
    url: 'https://example.com/',
  });

  assert.deepEqual(result.populatedMechanisms, [
    StorageMechanisms.Cookies,
    StorageMechanisms.LocalStorage,
  ]);
  assert.equal(result.respawnSignals.length, 1);
});

test('returns an empty scan when the scripting API is unavailable', async () => {
  const browserDetector = { getApi: () => ({}) };

  const result = await scanTabForEvercookies(browserDetector, {
    id: 1,
    url: 'https://example.com/',
  });

  assert.deepEqual(result, {
    stores: {},
    populatedMechanisms: [],
    respawnSignals: [],
  });
});
