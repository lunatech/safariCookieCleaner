/* eslint-disable require-jsdoc */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CleanupScopes,
  cookieMatchesScope,
  getRegistrableDomain,
  getScopeDetails,
  getTargetForScope,
  normalizeCookieDomain,
} from '../../interface/core/urlScope.js';

test('derives the registrable domain for common second-level domains', () => {
  assert.equal(getRegistrableDomain('app.example.co.uk'), 'example.co.uk');
});

test('keeps localhost and ip addresses intact', () => {
  assert.equal(getRegistrableDomain('localhost'), 'localhost');
  assert.equal(getRegistrableDomain('127.0.0.1'), '127.0.0.1');
});

test('extracts hostname and site details from a url', () => {
  const details = getScopeDetails('https://app.example.com/settings');

  assert.equal(details.hostname, 'app.example.com');
  assert.equal(details.site, 'example.com');
  assert.equal(details.protocol, 'https:');
  assert.equal(details.url.href, 'https://app.example.com/settings');
});

test('targets site and subdomain scopes explicitly', () => {
  assert.equal(
    getTargetForScope('https://app.example.com', CleanupScopes.Site),
    'example.com'
  );
  assert.equal(
    getTargetForScope('https://app.example.com', CleanupScopes.Subdomain),
    'app.example.com'
  );
});

test('matches cookies by site or exact subdomain', () => {
  const subdomainCookie = { domain: '.app.example.com' };
  const parentCookie = { domain: '.example.com' };

  assert.equal(
    normalizeCookieDomain(subdomainCookie.domain),
    'app.example.com'
  );
  assert.equal(
    cookieMatchesScope(
      subdomainCookie,
      CleanupScopes.Subdomain,
      'app.example.com'
    ),
    true
  );
  assert.equal(
    cookieMatchesScope(
      parentCookie,
      CleanupScopes.Subdomain,
      'app.example.com'
    ),
    false
  );
  assert.equal(
    cookieMatchesScope(parentCookie, CleanupScopes.Site, 'example.com'),
    true
  );
});
