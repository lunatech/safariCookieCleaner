[Docs home](index.md) · [Architecture](architecture.md) · [Development](development.md)

# How cookies work

A cookie is a small piece of text a server sends to a browser and the browser sends back on every subsequent request to that server. That round-trip is the entire mechanism. Everything else, including tracking, authentication, and personalization, is built on top of it.

## The Set-Cookie header

When a server wants to store a cookie it includes a `Set-Cookie` header in its HTTP response:

```
HTTP/1.1 200 OK
Set-Cookie: session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600
```

The browser stores the name-value pair (`session=abc123`) alongside the attributes. On every future request that matches those attributes, the browser attaches the cookie automatically:

```
GET /dashboard HTTP/1.1
Host: example.com
Cookie: session=abc123
```

The server reads the cookie, recognises the session, and responds as the right user. The browser never decides what the value means; it just remembers and echoes it.

## Cookie attributes

Each attribute controls when and how a cookie travels.

| Attribute | What it does |
|---|---|
| `Domain` | Which hostnames receive the cookie. Omitted means the exact host that set it; `Domain=example.com` also covers `sub.example.com`. |
| `Path` | Limits delivery to URLs under that path prefix. |
| `Max-Age` / `Expires` | Lifetime. Missing both means the cookie is deleted when the browser session ends (a "session cookie"). |
| `Secure` | Sent only over HTTPS. |
| `HttpOnly` | JavaScript cannot read it via `document.cookie`. Protects against XSS theft of session tokens. |
| `SameSite` | Controls cross-site delivery. `Strict` never sends cross-site. `Lax` sends on top-level navigations. `None` sends everywhere but requires `Secure`. |

## First-party vs. third-party

A **first-party cookie** is set by the domain in the browser's address bar. A **third-party cookie** is set by a different domain, typically an embedded script or image from an ad network or analytics provider.

Browsers are restricting third-party cookies. Safari's Intelligent Tracking Prevention has blocked them by default since 2017. Chrome has announced (and repeatedly delayed) a phaseout. But first-party cookies can still carry tracking identifiers, and CNAME cloaking lets third-party services masquerade as first-party by using a subdomain DNS alias.

## Cookie scope in practice

Two scopes matter most when you want to delete cookies without over-reaching:

- **Site scope** — the registrable domain (`example.com`). A cookie set with `Domain=example.com` is sent to every subdomain: `www.example.com`, `app.example.com`, `api.example.com`.
- **Subdomain scope** — the exact hostname (`app.example.com`). A cookie set without an explicit `Domain` attribute, or with `Domain=app.example.com`, is sent only to that hostname.

Deleting at site scope removes everything. Deleting at subdomain scope leaves parent-domain cookies alone, which matters when you are logged in on `www.example.com` and only want to reset state on `app.example.com`.

## Inspecting cookies from the browser console

Safari's Web Inspector exposes the full cookie jar for the current page. Open it with **Develop → Show Web Inspector** (enable the Develop menu first under **Safari → Settings → Advanced → Show features for web developers**).

### The Storage panel

The **Storage** tab shows every cookie scoped to the current page in a table. You can see the name, value, domain, path, expiry, and flags without writing any code. Click a row to edit a value inline or delete a single cookie with the minus button.

### Reading cookies from the console

Switch to the **Console** tab. JavaScript running in the page context can read non-`HttpOnly` cookies via `document.cookie`:

```js
// Print all readable cookies as a raw string
document.cookie
// → "session=abc123; _ga=GA1.2.123456789.1700000000; theme=dark"
```

`document.cookie` returns a single string of `name=value` pairs separated by `; `. To work with them as an object:

```js
// Parse into a plain object
Object.fromEntries(
  document.cookie.split('; ').map(pair => pair.split('='))
)
// → { session: "abc123", _ga: "GA1.2.123456789.1700000000", theme: "dark" }
```

### Reading cookies via the Cookie Store API

Newer browsers expose `cookieStore`, an async API that returns structured objects and also sees `HttpOnly` cookies in a service worker context. Safari's console does not support top-level `await`, so wrap the call in an async IIFE:

```js
// List all cookies visible to the current page
;(async () => {
  const cookies = await cookieStore.getAll()
  cookies.forEach(c => console.log(c.name, c.value, c.domain, c.expires))
})()
```

`cookieStore` is available in Safari 16.4+. It still cannot read `HttpOnly` cookies from a page context; those are deliberately hidden from JavaScript.

### Setting and deleting cookies from the console

You can set a cookie directly to test expiry, scope, or flag behaviour:

```js
// Set a session cookie (no Max-Age or Expires = deleted on browser close)
document.cookie = "test=hello; Path=/"

// Set a cookie that expires in 60 seconds
document.cookie = "test=hello; Path=/; Max-Age=60"

// Delete a cookie by setting Max-Age=0 (must match original Domain and Path)
document.cookie = "test=; Path=/; Max-Age=0"
```

`document.cookie =` does not overwrite the whole cookie jar. Each assignment sets or replaces one cookie by name.

### Seeing HttpOnly and Secure cookies

`HttpOnly` cookies never appear in `document.cookie` or `cookieStore.getAll()` from a page context. To inspect them you must use the Storage panel in Web Inspector, which reads directly from Safari's cookie store rather than through the JavaScript sandbox.

If a cookie you expect to exist is missing from `document.cookie`, check the Storage panel first. It is likely `HttpOnly`.

### Watching cookie changes in real time

`cookieStore.addEventListener('change', ...)` is not reliable in Safari's page context. It fires only for changes made through `cookieStore.set()`, not for cookies set by `Set-Cookie` response headers or via `document.cookie =`. Use a polling interval against `document.cookie` instead:

```js
// Poll for non-HttpOnly cookie changes every 500ms
let _prev = document.cookie
const _watcher = setInterval(() => {
  const curr = document.cookie
  if (curr === _prev) return
  console.log('cookies changed')
  console.log('before:', _prev)
  console.log('after: ', curr)
  _prev = curr
}, 500)

// To stop watching:
// clearInterval(_watcher)
```

This catches every non-`HttpOnly` cookie change regardless of how it was set. `HttpOnly` cookies changing in response to a request will not appear here; use the Storage panel in Web Inspector to spot those.

## What cookies cannot do

A few common misconceptions:

- A cookie from `example.com` cannot be read by `other.com`. The same-origin policy prevents cross-site cookie access from JavaScript.
- Cookies are not encrypted at rest by the browser; they are stored as plain text on disk. `Secure` only controls transmission over the network, not storage.
- Deleting cookies does not delete browser cache, localStorage, sessionStorage, IndexedDB, or service worker registrations. A site can survive a cookie deletion if it stored a tracking identifier in any of those other stores.

That last point is why Safari Cookie Cleaner checks for [respawning cookies](respawning-cookies.md): cookies are still the main identifier store, but a site can write the same ID into other browser storage and restore it after a delete.
