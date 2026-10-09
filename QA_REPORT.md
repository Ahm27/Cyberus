# Cyberus Challenges QA Report

Tested against the local PostgreSQL-backed application on October 5, 2026.

## Outcome

- 22 database-backed HTTP journeys pass.
- 12 browser journey assertions pass.
- All ten online challenge delivery paths reach 10/10.
- Offline state, solves, and third-solve eligibility survive reload through IndexedDB.
- Landing, registration, offline, dashboard, challenge, staff, and admin screens have no horizontal overflow at 360, 375, 390, 412, or 430 pixels.
- Tested browser pages produce no uncaught exceptions or error-level console entries.

## Defects found and fixed

| Severity | Defect                                                                                    | User impact                                                    | Resolution                                                                                     |
| -------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| High     | IDOR screen used the generic option-card branch and did not render an editable profile ID | Challenge 01 could not be solved from the UI                   | IDOR now presents the profile ID field and the complete interaction was browser-tested         |
| High     | Prize and platform QR values differed between server and browser hosts                    | React hydration failed and rebuilt QR sections                 | QR values now use the configured canonical public URL on both server and client                |
| High     | A concurrent redemption loser surfaced as HTTP 500                                        | Staff saw a server failure during a valid race                 | Prisma serialization conflicts now return a clear 409 already-claimed response                 |
| High     | Development CSP blocked React evaluation                                                  | Local buttons and hydration could fail                         | `unsafe-eval` is allowed only in development; production CSP remains stricter                  |
| Medium   | CSRF origin validation compared against Next's normalized internal URL                    | Valid `127.0.0.1` and reverse-proxy requests could be rejected | Origin is now checked against actual host and forwarded protocol headers                       |
| Medium   | Next blocked development assets on `127.0.0.1`                                            | HMR/hydration could fail on the displayed local address        | `127.0.0.1` is an allowed development origin                                                   |
| Medium   | Landing copy, terminal content, and action buttons overflowed 360px                       | Important content was clipped on target phones                 | Shell width, card minimum sizing, wrapping, and mobile action stacking were corrected          |
| Medium   | A valid long hacker alias widened the dashboard                                           | Dashboard overflowed on small phones                           | Card children and headings now safely wrap long content                                        |
| Medium   | Caesar and Base64 showed encoded text without initializing decoder state                  | “Use decoded result” could submit an empty value               | Encoded payload now initializes helper state and works without a manual edit                   |
| Medium   | Flag rate limiting used one bucket across all challenges                                  | Fast legitimate progress could be throttled                    | Limits are scoped per participant and challenge                                                |
| Medium   | Participant and staff sessions had no logout journey                                      | Shared devices could retain access                             | Both logout flows delete the server session and browser cookie                                 |
| Low      | Interaction and flag submission shared one error state                                    | Errors appeared in two unrelated cards                         | Each action now owns its error state                                                           |
| Low      | Home link tap target was only 38px                                                        | It was harder to tap on phones                                 | Header navigation is at least 44px high                                                        |
| Low      | Missing favicon produced a browser 404                                                    | Noisy console and incomplete browser branding                  | The Cyberus SVG is declared as the application icon                                            |
| Low      | Repeated challenge/admin controls lacked distinct accessible names                        | Screen-reader navigation was ambiguous                         | Contextual labels were added to challenge actions, editing fields, QR images, and staff lookup |

## Database-backed journey coverage

The `scripts/qa-journeys.mjs` suite verifies:

1. Cross-origin mutation rejection.
2. Unauthorized admin redirection.
3. Registration and secure session issuance.
4. Normalized duplicate University ID rejection.
5. Participant dashboard authorization.
6. Different flags for different participants.
7. Stable instances across refreshes.
8. Incorrect, shared, and cross-challenge flag rejection.
9. Unique solve counting.
10. Third-solve prize creation.
11. No duplicate prize after later solves or refresh.
12. All ten challenge paths and 10/10 completion.
13. Challenge/admin/SQL isolation.
14. Staff authentication.
15. Challenge editing, leaderboard toggling, and instance rotation.
16. Staff lookup by code, University ID, and QR identifier.
17. Masked staff verification data.
18. Exactly one winner during simultaneous redemption.
19. Offline/online duplicate-prize prevention.
20. Alias-only leaderboard output.
21. No automatic offline-to-online progress merge.
22. Participant and staff server-side logout.

Test-created participants, sessions, claims, solves, and offline records are removed after each run.

## Browser coverage

The `scripts/qa-ui.mjs` suite uses an isolated Chrome profile and verifies:

- Responsive overflow at 360, 375, 390, 412, and 430 pixels.
- Minimum primary touch-target sizes.
- Registration form layout.
- Offline hydration, ten cards, generated ID, solve persistence, and third-solve eligibility.
- Online third-solve prize card and QR.
- Long-alias dashboard behavior.
- Editable IDOR controls and successful investigation.
- Caesar and Base64 helper behavior.
- Challenge, staff, and admin responsive layouts.
- Absence of browser exceptions and error logs.

## Remaining risks and manual checks

- Offline mode is intentionally trust-based and can be manipulated by a technically advanced participant. HR verification remains required.
- The rate limiter is process-local. Multi-instance deployment needs a shared Redis-backed implementation.
- QR scanning relies on the phone camera opening the verification URL; an embedded camera scanner is not included.
- The repository still uses a palette-matched placeholder SVG because the official Cyberus logo was not supplied with the brief.
- Run a physical-device rehearsal on iOS Safari and Android Chrome, including installed-PWA behavior and real weak-network transitions.
- Run the optional Vitest PostgreSQL suite with `TEST_DATABASE_URL` in CI. The local QA journey suite already exercised the configured PostgreSQL database.
- Perform a manual screen-reader pass before the event; automated checks cover names, control sizes, overflow, and browser errors, but not spoken navigation quality.

## Commands

With the app running through `npm run dev`:

```bash
npm run qa:journeys
```

The UI suite additionally expects an isolated Chrome instance with remote debugging on port 9222:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --remote-debugging-port=9222 \
  --user-data-dir=/tmp/cyberus-cdp-profile about:blank
npm run qa:ui
```
