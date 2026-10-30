# Rental Property UI simulation

Created 2026-10-27 from the local BE contract in `DOANTOTNGHIEPBE/docs/PROPERTY_API.md` and its controller/DTO definitions.

## Purpose

Run Angular Property and PropertyType flows through actual HTTP without app infrastructure. One `rental-property` member, handler in `postman/mocks/rental-property/default.js`. Fixtures are synthetic and never imported into Angular production code.

## Execution

Commands and UI assertions: `docs/PROPERTY_UI.md`, `rental-property-preview.cjs`, `rental-property-ui.smoke.cjs`, `rental-property-admin.smoke.cjs`. Run from the FE root. CLI listening event must report port 4907 before starting the local production preview on 4207. Both processes are local and can be stopped with Ctrl+C; smoke tests reset their own mock state.

## Assumptions

- 2026-10-27: this mock is scoped to Property UI calls, not a replacement for BE tests. Auth session is synthetic; it does not establish JWT or database behavior. Unknown/unmodeled routes return 501.
- 2026-10-27: UI smoke scripts need Playwright and installed Edge, established by successful headless Edge runs on Windows. A different browser requires changing the launch channel in the local smoke script.

## Observations

<!-- begin:observations -->
- 2026-10-27: rental-listing-ui.smoke.cjs passed for anonymous public post browsing and ADMIN all-status post management, with no calls to private Room lists or category-room endpoints. Fixtures explicitly include unpublished Room data and non-public post states.
- 2026-10-27: both smoke scripts passed against the production build. The api member served catalog/address reads, create/read/update Property/Room flows and PropertyType CRUD. Request events showed the deliberately injected 503, subsequent successful POST and in-use 409; screenshot layout checks found no page-wide overflow at 390px.
<!-- end:observations -->

## What didn't work

- 2026-10-27: the repository's full Angular unit suite still has an unrelated scaffold title assertion in app.spec.ts; the feature suite is green. Details in docs/PROPERTY_UI.md.
- 2026-10-27: rental-room-type-tree.smoke.cjs passed against production Angular with stateful synthetic RoomType CRUD; hierarchy, parent defaults/exclusions, admin 409 feedback, public selection, and 390px overflow checked. No API/schema change.

- 2026-10-27: compact public picker smoke passed: overlay does not shift hero, closes on selection/Escape/backdrop, ancestor search and mobile 390px. Fresh simulation pm.state creation raced on initial concurrent reads once; warming API via one awaited fetch before browser run avoided the initialization failure.
