# Pattern Forge — current work and handover

Last updated: 7 October 2026 (UK). Read this first when continuing the project.
Update this file after every completed stage and before ending each work session.

## Purpose and current stage

Pattern Forge combines a seamless tile editor (Pattern) with a standalone drawing
workspace (Doodle). The current work adds practical editing, reusable motifs,
fill/pressure controls, colourways and physical-scale previews, then verifies
save/reopen, export and mobile usability before release.

**Current stage: verified staging package ready; source and handover saved to
GitHub. Staging publication awaits an authorised deployment route. Physical
Android release approval remains open.**

The source feature work and browser hardening have progressed beyond the last
published staging version. Do not restart those features or assume the old
staging interface is the latest implementation.

## Source of truth and publishing boundaries

| Item | Verified state at takeover |
| --- | --- |
| Repository | `sapiverpress-studio/Pattern-forge` |
| Active working branch | `feature/advanced-editing-v1` |
| Latest saved implementation | `7030c64501d2f0689babab7ea44feef439a64951`; subsequent status-only commits may advance HEAD |
| Incoming development head | `b3c357b50245f770f1caac6660ad1dff80c9027f` — 6 October, 19:51 BST |
| UX2 branch | `feature/canvas-first-ux-v2` at `06a9fdb9da5955b2dc73e58916ba610968ef94e2` |
| Development vs UX2 at takeover | 113 commits ahead, 0 behind; not merged |
| Production/main | `3ea35cee5d5d528eef30c4a038afebdabb1b9d44` |
| Production URL | https://sapiver-pattern-forge.netlify.app/ |
| Production deploy | `6abe8d9e2cf67500089091ba`, published 1 October, 17:43 BST; ready |
| Staging URL | https://sapiver-pattern-forge-ux2-staging.netlify.app/ |
| Staging site ID | `b27b1208-9ab0-4166-ad28-661aff39e579` |
| Staging deploy at takeover | `6ac226566d5c6842cea2c5c8`, published 4 October, 11:11 BST; ready |
| Staging source provenance at takeover | Uploaded build; Netlify records no source SHA. Historical handover identifies tested app source `3fb82dc` with later test/documentation commits. |

Jim authorised continuing the work and the proposed staging update on 7 October.
This is not authority to publish production, merge into main or release an APK.
Keep advanced editing on its current branch; do not merge into UX2 merely to
publish a staging package. The Android `preview-ux2` profile points to staging;
the default wrapper points to production. An installed APK's effective URL must
be checked, not assumed.

## What has been implemented, and where to find it

The following are implemented in the **development interface**, with browser
regression evidence below. At takeover, they are **not published on the current
staging or production sites**. Update that statement after publication and live
verification. Availability is different from physical Android validation.

| Feature | Where the user finds it | Source / browser status |
| --- | --- | --- |
| Consistent saved favourite tools | Tools menu; choose quick tools | Implemented; reload and workspace-switch coverage |
| Multi-select, group/ungroup, move, scale, rotate, duplicate, delete, flips | Select tool; add artwork to selection; contextual controls | Implemented; transforms, save/reopen and undo covered |
| Recolour selected drawn artwork and replace matching colours | Colour panel | Implemented; editable marks and replacement covered |
| Stroke stabilisation | Brush contextual controls → Stabilise | Implemented |
| Reusable editable motifs, including Doodle → Pattern | Motifs panel → save selected artwork; insert saved motif | Implemented; cross-feature regression covered |
| Bucket fill with tolerance and visible-canvas sampling | Fill → Bucket | Implemented; contours, repeat seams, undo and budget checks |
| Alpha Lock | Layers → selected layer → Alpha Lock | Implemented; paint/recolour/eraser/reopen/export checks |
| Clipping masks | Layers → Clip to layer below | Implemented; raster and SVG checks |
| Stylus pressure width, minimum width and response | Brush → Pressure width; Brush library → Stylus pressure | Implemented; synthetic stylus and mouse/finger fallback checks; physical stylus unverified |
| Controlled scatter, spacing/no-overlap, preserve manual placements, freeze | Pattern → Design setup → Image scatter | Implemented; repeat seams and frozen scatter persistence covered |
| Saved variations and colourways, rename/duplicate/compare, batch export | Pattern → Design setup → Variations & colourways | Implemented; export preserves current work |
| Physical-scale preview, units, rulers, view windows and repeat-cell boundaries | Pattern → Design setup → Product-scale preview | Implemented; scale/units/half-drop/brick checks; not a printer proof |

Doodle stays standalone; its mirror, grid and guides are under Canvas setup.
The Line shape exists, but **line-connect is deferred**, not completed.

## Completed stages and evidence

1. Editing foundation: grouping, recolouring, smoothing, motif reuse, scatter,
   saved variations, scale preview, clipping and stylus capture implemented.
2. Bucket fill: seam-aware editable contour engine, tolerance/sampling controls,
   undo and performance-budget coverage implemented.
3. Alpha Lock: stored layer state and rendering/export behaviour implemented.
4. Pressure refinement: minimum width, response and stabilisation coverage added.
5. Colourway polish: management and state-safe named PNG/SVG/project ZIP export.
6. Scale-preview polish: unit conversion, rulers, view windows and repeat-cell
   boundaries tested.
7. Integration hardening: combined motif/group/flip/recolour/clipping/variation
   chains; frozen scatter save/reopen; 40-state history cap after 45 edits;
   32px minimum for tested primary compact controls.
8. Takeover on 7 October: inspected current remote branches, commits, test logs,
   deployment records and previous plan. No production changes.

### Verified incoming automated tests

| Test | Result and exact evidence |
| --- | --- |
| Complete UX audit | **48/48 pass**, 4 advisory layout warnings, at `b3c357b5`: https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37514528103 |
| Extended readiness | **31/31 pass** at parent `7b1bae2f`: https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37514518558 |
| Difference from parent | `b3c357b5` changes only the undo-cap test interaction; application code is identical to the passing readiness run |
| Layout qualification | Four warnings refer to off-screen controls within scrollable rails. Separate checks scroll to and hit-test tools/colours across five viewport sizes; they pass. These are not physical touch/cutout checks. |
| Export qualification | Browser roundtrips cover Pattern straight/half-drop/brick and Doodle, PNG/SVG/JSON/ZIP, malformed imports, cancelled operations and storage failure/recovery. |

Fresh local packaged-site verification is now complete: **48/48 UX checks and
31/31 readiness checks pass**, with the same four scroll-rail advisory warnings.
Machine-readable evidence is committed under `docs/verification-2026-10-07/`.
Desktop design-setup and pressure-control screenshots were visually inspected.
This is not a published-site or physical Android pass.

## Work in progress on 7 October

- Added this handover and root `AGENTS.md` requiring it to be read and updated.
- Preparing a package script that takes an explicit immutable commit, includes
  only static site files, inserts build identity and writes per-file SHA-256
  hashes to `build.json`.
- Repairing the manual deploy workflow's obsolete `f966a289` source pin. The
  replacement uses the selected branch's event SHA, restricts publication to the
  staging site and runs both browser suites against the packaged site first.
- Correcting audit checkout to the event SHA (a moving branch head can make a CI
  result describe different code from its triggering commit).
- Correcting packaging to support advanced editing and its exact event SHA.
- Updating old help labels, bucket-fill instructions, backup guidance and the
  unsupported blanket “print-ready” claim. Adding a visible build label to the
  home/help footer in packaged builds.

Implementation packaged locally as commit `0b3c3df042b4834c04c6939685011e74e02b4fd8` (local test source; remote commit identity is recorded after publication).
Packaging validation passed: exact SHA, all 20 static-file hashes, exclusion of
tests/mobile/development files, visible/meta build labels, refusal to overwrite an
existing directory, and rejection of a moving branch name as the source.
Workflow YAML, JavaScript syntax and diff whitespace checks passed.
Fresh packaged-site results: readiness **31/31 pass**; complete UX **47/48 pass**.
The undo-depth check failed at “Forty redos did not restore the latest state”.
Root cause reproduced: history state updates immediately, but the opacity control
refreshes on requestAnimationFrame. The test read the old control value before
that frame. Probe evidence: undo immediate=55/rendered=95; redo
immediate=95/rendered=55. The application restored correctly. The test now waits
for the exact expected UI value and additionally verifies visible Undo/Redo plus
55% opacity in an exported editable project. The full rerun passed 48/48; readiness remains 31/31 on identical
application files. No drawing/history-engine change was required.

The changes are saved to `feature/advanced-editing-v1` in remote commit
`7030c64501d2f0689babab7ea44feef439a64951`. All 12 changed files were fetched back
and matched byte for byte. The package made from that remote commit matches the
locally tested package except for its new build identity. The local candidate
commits were not pushed; use the remote branch as the authoritative continuation
point. The standalone git client has no credentials; the connected GitHub tool
performed the successful commit. Staging publication is still pending.

GitHub packaging succeeded on this source:
https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37580461656
The new GitHub UX audit is running:
https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37580461473
The exposed Netlify tools report deploy state but provide no deploy/upload action;
the GitHub tools provide no workflow-dispatch action. A signed-in browser fallback
requires user approval under this session's browser tool rules.

## Remaining work, in order

1. Packaging/workflow/help validation: **done** (results above).
2. Fresh complete UX and extended-readiness tests: **done**, 48/48 and 31/31.
3. Source commit and remote-file verification: **done**, `7030c645`; packaging CI also passed.
4. With an authorised deployment route, publish to the existing staging site,
   verify ready state and compare deployed
   `build.json` plus asset hashes with the package. Check live Pattern/Doodle
   entry, visible new controls, drawing, project save/reopen and export.
5. Perform the physical Android gate below. If this environment cannot reach the
   phone, say so and provide a precise device checklist; do not claim it passed.
6. Record a readiness decision. Production merge/deploy or APK release requires
   an explicit subsequent release decision by Jim.

## Physical Android gate — still unverified

- Record phone model, OS/WebView, installed APK version/profile and effective URL.
- Export PNG, SVG, editable JSON and ZIP; locate and reopen files; cancel directory
  picker and share sheet; check clear failure feedback and retained artwork.
- Import images (including an unplaced library asset), draw/transform, save,
  terminate and reopen; verify latest autosave and portable project recovery.
- Exercise fullscreen, actual camera cutout/system bars, rotation, favourites,
  tool switching and Android Back with panels open and in fullscreen.
- Native Back currently uses WebView history; panel/fullscreen priority needs
  device verification and may require a fix. Read `mobile/AGENTS.md` before changes.
- Test large imports/layers and 4000px or rectangular exports on the intended
  phone; desktop JS heap measurements exclude native canvas/image memory.
- Check physical stylus response if pressure support will be advertised.
- Do not promise offline cold start: the wrapper loads a hosted site and has no
  bundled offline editor/service worker in this configuration.

Any data loss, misleading export, fullscreen trap, broken Back or orientation
failure blocks an Android tester release until investigated.

## Continuity rules

After each stage record: what changed, source commit, actual test result, deploy
ID when relevant, unresolved risks, and the next action. Preserve historical
evidence but make the current state unmistakable. Never invent completion or
carry a stale branch/deploy identifier forward without checking it.

Older references: `docs/UX2-HANDOVER-2026-10-04.md`,
`docs/UX2-EXTENDED-TEST-REPORT-2026-10-04.md`, `docs/ANDROID-READINESS.md`.
They describe earlier checkpoints, not the latest feature state.
