/* eslint-disable require-jsdoc */

import {
  CleanupScopes,
  cookieMatchesScope,
  getScopeDetails,
} from './urlScope.js';

function getApi(browserDetector) {
  return browserDetector.getApi();
}

async function getAllCookies(browserDetector, details) {
  const api = getApi(browserDetector);
  if (browserDetector.supportsPromises()) {
    return api.cookies.getAll(details);
  }

  return new Promise(resolve => {
    api.cookies.getAll(details, cookies => {
      resolve(cookies || []);
    });
  });
}

async function removeCookie(browserDetector, details) {
  const api = getApi(browserDetector);
  if (browserDetector.supportsPromises()) {
    return api.cookies.remove(details);
  }

  return new Promise(resolve => {
    api.cookies.remove(details, result => {
      resolve(result || null);
    });
  });
}

export function buildCookieRemovalUrl(cookie) {
  const domain = (cookie.domain || '').replace(/^\./, '');
  const protocol = cookie.secure ? 'https' : 'http';
  let path = cookie.path || '/';
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return `${protocol}://${domain}${path}`;
}

export function filterCookiesForManualCleanup(cookies, url, scope) {
  if (scope === CleanupScopes.Site) {
    return cookies;
  }

  const details = getScopeDetails(url);
  return cookies.filter(cookie => {
    return cookieMatchesScope(
      cookie,
      CleanupScopes.Subdomain,
      details.hostname
    );
  });
}

export function filterCookiesForRule(cookies, rule) {
  return cookies.filter(cookie => {
    return cookieMatchesScope(cookie, rule.scope, rule.target);
  });
}

export async function deleteCookiesForCurrentTab(browserDetector, tab, scope) {
  const cookies = await getAllCookies(browserDetector, {
    url: tab.url,
    storeId: tab.cookieStoreId,
  });
  const cookiesToDelete = filterCookiesForManualCleanup(
    cookies,
    tab.url,
    scope
  );
  const removedCount = await removeCookies(browserDetector, cookiesToDelete);
  return {
    removedCount: removedCount,
    matchedCount: cookiesToDelete.length,
  };
}

export async function deleteCookiesForRule(browserDetector, rule) {
  const cookies = await getAllCookies(browserDetector, {});
  const cookiesToDelete = filterCookiesForRule(cookies, rule);
  const removedCount = await removeCookies(browserDetector, cookiesToDelete);
  return {
    removedCount: removedCount,
    matchedCount: cookiesToDelete.length,
  };
}

export async function removeCookies(browserDetector, cookies) {
  const removals = await Promise.all(
    cookies.map(cookie => {
      return removeCookie(browserDetector, {
        name: cookie.name,
        url: buildCookieRemovalUrl(cookie),
        storeId: cookie.storeId,
      }).catch(error => {
        console.error('Failed to remove cookie', cookie, error);
        return null;
      });
    })
  );

  return removals.filter(Boolean).length;
}
