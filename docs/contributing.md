---
title: Contributing
---

[Docs home]({% link index.md %}) · [Development]({% link development.md %}) · [Architecture]({% link architecture.md %}) · [Publishing]({% link publishing.md %})

# Contributing

Safari Cookie Cleaner is a small, opinionated Safari-only project. Contributions help most when they keep that shape intact: focused cleanup, clear explanations, and as little product sprawl as possible.

## On this page

* TOC
{:toc}

## What this project is

Safari Cookie Cleaner exists to do two things well:

1. Give people a narrow tool for clearing site tracking state in Safari.
2. Explain how cookies and related browser storage get used and misused on the web.

Those same two goals shape this docs site:

- **Contributors** — the path you are reading now
- **[The Web Cookie Book]({% link web-cookie-book.md %})** — the path for learners

## What kinds of contributions help

Good contributions usually fall into one of these buckets:

- Safari extension behaviour: cookie cleanup, scope handling, recurring rules, permission flows
- Safari app and wrapper maintenance: build fixes, platform compatibility, Xcode project upkeep
- Tests for core cleanup logic under `interface/core/` and `tests/core/`
- Documentation that makes the contributor path or learner path clearer and easier to follow

## Before you start

A few constraints matter up front:

- The product is intentionally **Safari only**.
- The product is intentionally **cleanup focused**.
- This is not a general-purpose cookie viewer, editor, sync service, or telemetry product.
- Signed local builds require your own Apple Developer account and signing identity.

If a proposed feature pushes against those boundaries, make the case first in an issue.

## Start here

- [Development]({% link development.md %}) — install dependencies, run tests, build the extension payload, and load the app locally
- [Architecture]({% link architecture.md %}) — understand how the extension and wrapper app fit together
- [Publishing]({% link publishing.md %}) — release steps if you are maintaining your own signed fork

## Good first contribution areas

- Tighten cookie cleanup edge cases around site vs. subdomain scope
- Improve tests for pure logic in `interface/core/`
- Simplify popup or options flows without broadening scope
- Improve explanations in [The Web Cookie Book]({% link web-cookie-book.md %}) with concrete, source-backed examples

## Reporting changes

The source is on [GitHub](https://github.com/lunatech/safariCookieCleaner). To report a bug or propose a change, [open an issue](https://github.com/lunatech/safariCookieCleaner/issues).
