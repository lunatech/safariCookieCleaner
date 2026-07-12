---
title: World famous cookies
---

[Docs home](index.md) · [How cookies work](how-cookies-work.md) · [Evercookie tracking](evercookie.md)

# World famous cookies

A cookie name can offer a clue about who set it and why, but it is not a verdict. The same company may use different cookies by product, region, account state, and consent choice. Values are usually opaque identifiers; do not paste them into bug reports or public forums.

Here are cookies you are likely to meet on three heavily used parts of the web.

## Google: `NID` and `__Secure-1PSID`

Google Search commonly sets `NID`. Google says it uses `NID` and `_Secure-ENID` to remember preferences and other information, including language, result count, and SafeSearch settings. Subject to a user's choices, Google also uses cookies including `NID` for advertising and analytics.

Signed-in users may see cookies in the `SID` and `__Secure-1PSID` families. Google describes these as authentication, fraud-prevention, security, advertising, and personalisation cookies. The `__Secure-` prefix is meaningful: browsers only accept such a cookie when it is set over HTTPS with the `Secure` attribute.

What deletion does:

- Removing preference cookies can reset language, SafeSearch, or other choices.
- Removing authentication cookies can sign you out.
- Google can set fresh cookies when you return, depending on the service, account state, and consent settings.

Source: Google, [How Google uses cookies](https://policies.google.com/technologies/cookies?hl=en-US).

## Cloudflare: `__cf_bm` and `cf_clearance`

Cloudflare often sits in front of another website, so a Cloudflare cookie can appear on a domain that is not owned by Cloudflare.

`__cf_bm` supports Cloudflare Bot Management. Cloudflare says the cookie contains information related to calculating its proprietary bot score, is encrypted so customers cannot inspect its contents, and expires after 30 minutes of continuous inactivity. A separate `__cf_bm` cookie is created for each protected site.

`cf_clearance` records that a visitor passed a Cloudflare challenge. The cookie lets later requests reach the protected site without repeating the same challenge until the clearance expires or is no longer valid. Deleting it can cause the challenge to appear again.

These are usually security and traffic-management cookies rather than evidence that the site itself created an advertising profile.

Source: Cloudflare, [Cloudflare cookies](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/).

## Yahoo: `A1`, `A3`, and `GUCS`

Yahoo uses cookies for sign-in, security, preferences, measurement, content, and advertising. Common Yahoo-domain cookie jars include short names such as `A1`, `A3`, and `GUCS`. Yahoo's public policy explains the purposes of its cookies as categories rather than maintaining a stable name-by-name reference, so the exact role of a short cookie name can change.

Third-party cookie catalogues commonly classify `A1` and `A3` as Yahoo advertising or personalisation identifiers. Treat that classification as a useful lead, not a guarantee about a particular request. Check the cookie's domain, expiry, attributes, and the network response that set it before drawing a conclusion.

What deletion does:

- It may reset sign-in, consent, personalisation, or advertising state.
- Yahoo or an embedded Yahoo advertising service may set a replacement during a later visit.
- Rejecting optional cookies can change personalisation without necessarily removing cookies required for sign-in or security.

Sources: Yahoo, [Cookies and similar technologies](https://legal.yahoo.com/us/en/yahoo/privacy/topics/cookies/index.html) and [Cookie Policy](https://legal.yahoo.com/ie/en/yahoo/privacy/cookies/index.html); Cookiepedia, [yahoo.com cookie catalogue](https://cookiepedia.co.uk/host/yahoo.com).

## Inspect before deleting

In Safari, open **Develop → Show Web Inspector → Storage → Cookies**. For each cookie, check:

1. **Domain**: who receives it. A leading dot or parent domain may make it available to subdomains.
2. **Expires / Max-Age**: whether it is a session cookie or persists.
3. **Secure** and **HttpOnly**: whether it requires HTTPS and whether page JavaScript can read it.
4. **SameSite** and **Partitioned**: when it can accompany cross-site requests and whether Safari keeps it in a partitioned context.
5. **The setting response**: the `Set-Cookie` header in the Network panel is the best evidence for where it came from.

Cookie names are labels chosen by their authors. Browser attributes and network evidence tell you what the browser will actually do.
