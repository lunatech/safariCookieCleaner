---
title: The Web Cookie Book: Respawning cookies
---

[Docs home]({% link index.md %}) · [The Web Cookie Book]({% link web-cookie-book.md %}) · [How cookies work]({% link how-cookies-work.md %}) · [Evercookie tracking]({% link evercookie.md %})

# Respawning cookies in Safari Cookie Cleaner

In industry terms, a cookie that comes back after deletion is usually called an **evercookie** or **zombie cookie**. Safari Cookie Cleaner calls the cleanup path **Respawning data** in the popup, but it is solving that same problem.

The extension looks for the simplest respawn pattern: the same identifier copied into more than one browser store. It scans the current page's `document.cookie`, `localStorage`, `sessionStorage`, `window.name`, and `cookieStore` when Safari exposes it. If the same string appears in more than one place, the popup shows it as a repeated value.

## On this page

* TOC
{:toc}

Example:

```text
cookies.session_id → localStorage.session_id
```

Values shorter than eight characters are ignored to avoid obvious false positives like flags, counters, and tiny state values.

The popup keeps the summary short:

```text
2 repeated values · clears site cookies + site data
```

The detailed evidence stays behind the disclosure. Each entry shows a preview of the repeated value, how many stores contain it, any cookie names involved, and the storage chain.

When you run **Respawning data** cleanup, Safari Cookie Cleaner does not try to delete one matching value at a time. It removes the current site's cookies and then clears the current page's site data: `localStorage`, `sessionStorage`, `window.name`, `cookieStore`, IndexedDB databases, and Cache API caches for that origin.

That broader cleanup is deliberate. If a site has copied one identifier into several stores, deleting only the cookie is not enough. One of the other stores can write it back on the next page load. Clearing site data can also sign you out or remove saved app state, which is why the popup keeps it as an explicit action instead of doing it on every cookie delete.

A few limits matter:

- The detector matches repeated values only in the JavaScript-accessible stores listed above.
- It does not inspect arbitrary IndexedDB records or cache bodies.
- It cannot read `HttpOnly` cookie values, ETags, the HTTP cache, or the favicon cache from the popup.

Cookie removal itself has one Safari-specific workaround. The cleaner first resolves every real cookie store with `cookies.getAllCookieStores()` and then queries each store directly. That avoids a Safari 18+ bug documented in the codebase where `cookies.getAll()` can return an empty result on the first call when `storeId` is left undefined.

If you want the broader background on evercookies and zombie-cookie tracking, read [Evercookie tracking]({% link evercookie.md %}). If you want the lower-level cookie basics first, start with [How cookies work]({% link how-cookies-work.md %}).
