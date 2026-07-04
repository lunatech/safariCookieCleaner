/* eslint-disable require-jsdoc */

const commonSecondLevelDomainPattern =
  /^(com|edu|gov|net|mil|org|nom|co|name|info|biz)$/i;

export const CleanupScopes = Object.freeze({
  Site: 'site',
  Subdomain: 'subdomain',
});

export function normalizeHostname(hostname) {
  return (hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\.+/, '')
    .replace(/\.$/, '');
}

export function normalizeCookieDomain(domain) {
  return normalizeHostname(domain);
}

export function isIpAddress(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

export function getRegistrableDomain(hostname) {
  const normalizedHostname = normalizeHostname(hostname);
  if (
    !normalizedHostname ||
    normalizedHostname === 'localhost' ||
    isIpAddress(normalizedHostname) ||
    !normalizedHostname.includes('.')
  ) {
    return normalizedHostname;
  }

  const parts = normalizedHostname.split('.').reverse();
  if (parts.length >= 3 && commonSecondLevelDomainPattern.test(parts[1])) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  return `${parts[1]}.${parts[0]}`;
}

export function getScopeDetails(url) {
  const parsedUrl = new URL(url);
  const hostname = normalizeHostname(parsedUrl.hostname);
  return {
    hostname: hostname,
    site: getRegistrableDomain(hostname),
    protocol: parsedUrl.protocol,
    url: parsedUrl,
  };
}

export function getTargetForScope(url, scope) {
  const details = getScopeDetails(url);
  if (scope === CleanupScopes.Site) {
    return details.site;
  }
  return details.hostname;
}

export function getScopeLabel(scope) {
  switch (scope) {
    case CleanupScopes.Site:
      return 'Site';
    case CleanupScopes.Subdomain:
      return 'Subdomain';
    default:
      return 'Unknown';
  }
}

export function cookieMatchesSite(cookie, siteTarget) {
  const normalizedDomain = normalizeCookieDomain(cookie?.domain);
  return (
    normalizedDomain === siteTarget ||
    normalizedDomain.endsWith(`.${siteTarget}`)
  );
}

export function cookieMatchesSubdomain(cookie, hostnameTarget) {
  return normalizeCookieDomain(cookie?.domain) === hostnameTarget;
}

export function cookieMatchesScope(cookie, scope, target) {
  if (scope === CleanupScopes.Site) {
    return cookieMatchesSite(cookie, target);
  }
  return cookieMatchesSubdomain(cookie, target);
}
