/* eslint-disable require-jsdoc */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCookieRemovalUrl,
  deleteCookiesForRule,
  filterCookiesForManualCleanup,
  filterCookiesForRule,
  getCookiesForCurrentTab,
} from '../../interface/core/cookieCleaner.js';
import { CleanupScopes } from '../../interface/core/urlScope.js';

const cookies = [
  { domain: '.app.example.com', path: '/', secure: true },
  { domain: '.example.com', path: '/', secure: true },
  { domain: '.admin.example.com', path: '/', secure: false },
];

test('builds a removable cookie url from cookie metadata', () => {
  assert.equal(
    buildCookieRemovalUrl({
      domain: '.app.example.com',
      path: '/session',
      secure: true,
    }),
    'https://app.example.com/session'
  );
});

test('keeps parent-domain cookies for subdomain-only cleanup', () => {
  assert.deepEqual(
    filterCookiesForManualCleanup(
      cookies,
      'https://app.example.com/dashboard',
      CleanupScopes.Subdomain
    ),
    [{ domain: '.app.example.com', path: '/', secure: true }]
  );
});

test('matches scheduled site rules across subdomains', () => {
  assert.equal(
    filterCookiesForRule(cookies, {
      scope: CleanupScopes.Site,
      target: 'example.com',
    }).length,
    3
  );
});

test('matches scheduled subdomain rules exactly', () => {
  assert.deepEqual(
    filterCookiesForRule(cookies, {
      scope: CleanupScopes.Subdomain,
      target: 'app.example.com',
    }),
    [{ domain: '.app.example.com', path: '/', secure: true }]
  );
});

class FakeBrowserDetector {
  constructor(cookiesByStoreId) {
    this.cookiesByStoreId = cookiesByStoreId;
  }

  supportsPromises() {
    return true;
  }

  getApi() {
    return {
      cookies: {
        getAllCookieStores: async () => {
          return Object.keys(this.cookiesByStoreId).map(id => ({ id: id }));
        },
        getAll: async details => {
          // Simulates the Safari 18 bug: an undefined storeId returns
          // nothing, even though real cookies exist.
          if (!details.storeId) {
            return [];
          }
          return this.cookiesByStoreId[details.storeId] || [];
        },
        remove: async () => true,
      },
    };
  }
}

test('resolves a real cookie store id instead of an undefined storeId', async () => {
  const browserDetector = new FakeBrowserDetector({
    0: [{ name: 'session', domain: 'example.com', storeId: '0' }],
  });

  const cookies = await getCookiesForCurrentTab(
    browserDetector,
    { url: 'https://example.com/', cookieStoreId: undefined },
    'test probe'
  );

  assert.equal(cookies.length, 1);
  assert.equal(cookies[0].name, 'session');
});

test('merges cookies across every store for scheduled rules', async () => {
  const browserDetector = new FakeBrowserDetector({
    0: [{ name: 'a', domain: 'example.com', storeId: '0' }],
    1: [{ name: 'b', domain: 'example.com', storeId: '1' }],
  });

  const result = await deleteCookiesForRule(browserDetector, {
    id: 'rule-1',
    scope: CleanupScopes.Site,
    target: 'example.com',
  });

  assert.equal(result.matchedCount, 2);
  assert.equal(result.removedCount, 2);
});
