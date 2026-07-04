/* eslint-disable require-jsdoc */

import {
  CleanupScopes,
  cookieMatchesScope,
  getScopeDetails,
} from './urlScope.js';

const LOG_PREFIX = '[SafariCookieCleaner][cookieCleaner]';

function getApi(browserDetector) {
  return browserDetector.getApi();
}

function summarizeCookie(cookie) {
  return {
    name: cookie?.name,
    domain: cookie?.domain,
    path: cookie?.path,
    secure: cookie?.secure,
    session: cookie?.session,
    storeId: cookie?.storeId,
  };
}

function summarizeCookies(cookies, limit = 5) {
  return cookies.slice(0, limit).map(summarizeCookie);
}

async function getAllCookies(browserDetector, details, reason) {
  const api = getApi(browserDetector);
  console.log(`${LOG_PREFIX} Fetching cookies`, {
    reason: reason,
    details: details,
  });
  if (browserDetector.supportsPromises()) {
    const cookies = await api.cookies.getAll(details);
    console.log(`${LOG_PREFIX} Fetch complete`, {
      reason: reason,
      count: cookies.length,
      sample: summarizeCookies(cookies),
    });
    return cookies;
  }

  return new Promise(resolve => {
    api.cookies.getAll(details, cookies => {
      cookies = cookies || [];
      console.log(`${LOG_PREFIX} Fetch complete`, {
        reason: reason,
        count: cookies.length,
        sample: summarizeCookies(cookies),
      });
      resolve(cookies);
    });
  });
}

async function removeCookie(browserDetector, details) {
  const api = getApi(browserDetector);
  console.log(`${LOG_PREFIX} Removing cookie`, details);
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

export async function getCookiesForCurrentTab(
  browserDetector,
  tab,
  reason = 'current-tab fetch'
) {
  return getAllCookies(
    browserDetector,
    {
      url: tab.url,
      storeId: tab.cookieStoreId,
    },
    reason
  );
}

export async function deleteCookiesForCurrentTab(browserDetector, tab, scope) {
  const cookies = await getCookiesForCurrentTab(
    browserDetector,
    tab,
    'manual cleanup'
  );
  const cookiesToDelete = filterCookiesForManualCleanup(
    cookies,
    tab.url,
    scope
  );
  console.log(`${LOG_PREFIX} Filtered current-tab cookies`, {
    scope: scope,
    url: tab.url,
    matchedCount: cookiesToDelete.length,
    matchedSample: summarizeCookies(cookiesToDelete),
  });
  const removedCount = await removeCookies(browserDetector, cookiesToDelete);
  console.log(`${LOG_PREFIX} Finished current-tab cleanup`, {
    scope: scope,
    url: tab.url,
    matchedCount: cookiesToDelete.length,
    removedCount: removedCount,
  });
  return {
    removedCount: removedCount,
    matchedCount: cookiesToDelete.length,
  };
}

export async function deleteCookiesForRule(browserDetector, rule) {
  const cookies = await getAllCookies(browserDetector, {}, 'scheduled rule');
  const cookiesToDelete = filterCookiesForRule(cookies, rule);
  console.log(`${LOG_PREFIX} Filtered scheduled-rule cookies`, {
    ruleId: rule.id,
    target: rule.target,
    scope: rule.scope,
    matchedCount: cookiesToDelete.length,
    matchedSample: summarizeCookies(cookiesToDelete),
  });
  const removedCount = await removeCookies(browserDetector, cookiesToDelete);
  console.log(`${LOG_PREFIX} Finished scheduled cleanup`, {
    ruleId: rule.id,
    target: rule.target,
    scope: rule.scope,
    matchedCount: cookiesToDelete.length,
    removedCount: removedCount,
  });
  return {
    removedCount: removedCount,
    matchedCount: cookiesToDelete.length,
  };
}

export async function removeCookies(browserDetector, cookies) {
  console.log(`${LOG_PREFIX} Removing cookie batch`, {
    count: cookies.length,
    sample: summarizeCookies(cookies),
  });
  const removals = await Promise.all(
    cookies.map(cookie => {
      return removeCookie(browserDetector, {
        name: cookie.name,
        url: buildCookieRemovalUrl(cookie),
        storeId: cookie.storeId,
      }).catch(error => {
        console.error(`${LOG_PREFIX} Failed to remove cookie`, cookie, error);
        return null;
      });
    })
  );

  const removedCount = removals.filter(Boolean).length;
  console.log(`${LOG_PREFIX} Removal batch complete`, {
    requestedCount: cookies.length,
    removedCount: removedCount,
  });
  return removedCount;
}
