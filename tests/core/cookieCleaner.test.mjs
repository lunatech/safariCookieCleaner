/* eslint-disable require-jsdoc */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCookieRemovalUrl,
  filterCookiesForManualCleanup,
  filterCookiesForRule,
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
