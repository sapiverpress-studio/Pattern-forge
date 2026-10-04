# Pattern Forge UX2 — completion audit and handover

Updated 4 October 2026 after the staging deployment published at 11:11 BST (10:11 UTC).

## Current outcome

The extended test-and-fix pass is published to UX2 staging. All 30 new export, recovery, favourites, layout and load checks pass locally. The broader UX audit passes 28 functional checks, and the editor suite and all 11 underlying engine smoke tests pass. New fixes protect recovery of the latest autosave, reject damaged imports, keep Doodle's canvas clear of the favourites rail and make long tool rails scrollable. This establishes a tested web staging build, not Android release approval.

Read [the extended test report](UX2-EXTENDED-TEST-REPORT-2026-10-04.md) for exact coverage, defects, measurements and qualifications. Small touch targets remain an open usability concern; physical Android download, memory and system-control checks remain unverified.

## Exact project and deployment

| Item | Value |
| --- | --- |
| Repository | sapiverpress-studio/Pattern-forge |
| Working branch | feature/canvas-first-ux-v2 |
| Tested application commit | 3fb82dc52b9fe9449c30d284bc0b22bc4e0f5ae4 |
| Latest test-only commit | 18a2e75131ea32fe4abc71c8154ace7092dc2f18 |
| Staging site | https://sapiver-pattern-forge-ux2-staging.netlify.app/ |
| Staging site ID | b27b1208-9ab0-4166-ad28-661aff39e579 |
| New deploy ID | 6ac226566d5c6842cea2c5c8 |
| Build ID | 6ac226566d5c6842cea2c5c6 |
| Previous staging deploy | 6ac210a41b9c57e90eb9f3fa |
| Deployment verification | Netlify state ready; published CSS and JavaScript match tested local files byte for byte |

Deploy permalink: https://6ac226566d5c6842cea2c5c8--sapiver-pattern-forge-ux2-staging.netlify.app/

The upload contained index.html, _headers, manifest.webmanifest, assets/, app/ and help/. No mobile build was uploaded. Netlify labels publication to this site's primary URL as production context; this is the separate staging site, not the product's production site.

Documentation commits after the test/workflow commit do not change the deployed application. The manual GitHub deploy workflow is still pinned to an older application commit and must not be dispatched as a shortcut to deploy the current branch without reviewing that pin.

## Requirements compared with current evidence

This baseline comes from the visible conversation and repository. It is not an independently recovered original business specification; unrecorded requirements must not be marked complete.

| User intent | Current state | Evidence / remaining qualification |
| --- | --- | --- |
| Doodle is standalone; no project creation options | Direct Doodle opens or restores without a creation decision | Doodle and editor browser tests pass |
| Tools remain usable in fullscreen | Creative tools, Tools menu, Colour, Layers and Canvas setup remain available | Ten additional layout cases cover both workspaces and five starting viewports, including rotation; small touch targets remain |
| Zoom left of favourites and clear of camera area | Grouped landscape Doodle layout is deployed | Bounds assertions pass; physical cutout still needs a phone check |
| Persistent favourites chosen from full Tools menu | Stored locally under patternForgeUx2FavouriteTools; selected tools form quick rail | Reload/workspace-switch/empty-selection tests pass; all quick colours reachable by scrolling long rails |
| Mirror and drawing assists available in Doodle | Mirror, grid, guides and snap exposed in Canvas setup | UI selects real mirror control; mirrored PNG pixel check passes |
| Doodle edges do not repeat | Unmirrored edge-crossing artwork clips to standalone canvas | Transparent opposite-edge PNG sample passes |
| Line connect is for later | Deferred requirement | Do not interpret the existing Line shape as completion of line-connect functionality |
| Full visual/coherency pass | Broad 28-check functional audit plus ten layout cases completed | Scanner still flags small targets; physical Android visual and ergonomic approval remains open |
| Fix, test and update audit | Recovery, import validation and Doodle layout fixes deployed in addition to earlier Export/backup notice | New 30-case suite, existing suites and corrected broader audit pass |
| Business analysis and release readiness | Evidence-based assessment below | Pricing, customer demand and commercial packaging remain unvalidated |

## Changes completed in this pass

The latest pass fixes stale fallback recovery, rejects malformed stroke points and duplicate image IDs, sizes the Doodle stage around its side controls and allows the full favourite-tool list to scroll. The extended report records the reproduced failure and verification for each fix. The following paragraphs describe the earlier work retained in this build.

Fullscreen now retains Export in Pattern and Doodle. The Export panel explains that autosave remains on the current device and asks users to save a project file before clearing app or browser data.

The initial engine failure was an obsolete requirement: the test enabled quadrant mirror and then asserted that no reflected artwork should appear on the opposite edge. Doodle now intentionally supports mirror. The repaired test first disables mirror and proves edges do not wrap, then enables vertical mirror and proves the reflected PNG pixels exist. Export, transparency, save and restore assertions remain in place.

The Doodle test no longer expects the removed project-menu flow. Layer tests explicitly exercise the legacy controls and then reopen the same saved work in the visible UX2 shell. Workflow URL adaptation now preserves explicit query strings and workspace routes.

No engine code was weakened to satisfy the obsolete test. No new mobile build was produced.

## Verification ledger

| Check | Result |
| --- | --- |
| Extended readiness: portable roundtrips, damaged imports, cancellations, save failure, favourites, layouts and larger design | 30/30 pass in final local run; GitHub run 37194461497 passes at test commit 18a2e75 |
| Broader UX audit | 28/28 functional checks pass locally and GitHub run 37194398024; 28 advisory layout warnings, explained in extended report |
| Latest real-editor GitHub check | Pass: run 37194398061 at application commit 3fb82dc |
| Latest underlying engine GitHub check | Pass: run 37194461448 at test commit 18a2e75 |
| JavaScript syntax: editor, workspace, canvas-first shell | Pass |
| Editor browser suite: tools, brush library, shapes, transforms, undo/redo, colour, layers, setup, exports and landscape fullscreen | Pass locally; application commit also passed GitHub run 37187988772 |
| Doodle: transparent no-wrap PNG, intentional mirror PNG, SVG, JSON and automatic standalone restore | Pass |
| Layer UI: order, export filtering, save/load, IndexedDB, duplicate/delete, lock | Pass |
| Layer UX: rename, unique names, visible-shell add/rename persistence | Pass |
| Drawn selection and transform geometry | Pass |
| Untransformed SVG compatibility with alpha.3 and transformed mark export | Pass |
| Construction guides: rendering, persistence and exclusion from export | Pass |
| Smart snap: grid, centres, edges and raw geometry preservation | Pass |
| Eyedropper return behaviour | Pass |
| Real eraser: active layer, lock, order, SVG mask, autosave, PNG alpha, mobile access | Pass |
| Image library removal and future IDs | Pass |
| Start again: cancel, reset, undo and preserved setup/library/layers | Pass |
| GitHub full engine regression at d4fd8ccb | Pass: run 37189499985 |
| Published CSS and editor engine JavaScript compared with tested files | Exact byte match |
| Direct browser run against published staging | Blocked before tests by net::ERR_EMPTY_RESPONSE in this browser environment; curl asset retrieval succeeds. Do not count as a live functional pass |
| Physical Android APK download, reopen, memory and system controls | Not run in this pass |

CI evidence:

- https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37194398024
- https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37194398061
- https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37194461448
- https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37194461497
- https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37187988772
- https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37189499985

The earlier failed engine runs remain in history. The successful run above is the relevant corrected result. Browser tests cannot establish native Android directory-picker or share-sheet reliability.

## Product and business assessment

The supported product proposition is a focused artwork and repeat-pattern editor with portable editable files. Doodle supplies a direct drawing entry; Pattern adds repeat structure. High-resolution exports, layers and reusable artwork support a plausible print-design workflow. These are product capabilities, not proof of market demand or provider acceptance.

The most useful near-term product work is completing the save/import/export journey on the actual Android package and reducing uncertainty around recovery and device limits. A user who cannot find a saved export or recover a drawing has lost the value of the other features. The fullscreen Export fix and backup explanation address discoverability; native save completion still needs evidence.

Local storage can reduce account and server requirements, but it also creates backup and support responsibilities. JSON/ZIP portability helps only if users can save, locate and reopen those files. The new notice does not make device storage durable.

Offline operation is not established. The Android wrapper loads a hosted URL; current source has no service worker or bundled offline editor. Do not advertise an offline APK based solely on local autosave. Likewise, 300-DPI metadata and pixel dimensions do not alone prove raster quality or conformance to a particular print provider's template.

A one-time purchase is a proposed business model, not a verified implementation or validated price. There is no evidence in this pass of customer interviews, conversion, willingness to pay, acquisition costs, competitor comparisons, support cost, refunds or licence enforcement. No revenue forecast or numerical readiness percentage is justified by these tests.

Commercial choices still needed: primary buyer and workflow, web versus APK distribution promise, actual offline commitment, price/licence and update policy, supported device limits, backup instructions and a documented support route. Treat these as open decisions; do not silently decide them through code changes.

## Release gates and next actions

1. Confirm the installed APK uses the staging URL. mobile/eas.json already has preview-ux2 for this purpose; the default wrapper points to the production website.
2. On a physical Android phone, export PNG, SVG, JSON and ZIP, locate each file and reopen it. Test save/share cancellation and meaningful failure feedback.
3. Import images, including an unplaced library image; draw, mirror, transform, save, terminate the app and reopen. Verify both portable files and local recovery.
4. Check actual cutouts, system bars, landscape rotation, fullscreen, favourites and Android Back. The current native Back handler uses WebView history and has no explicit palette/fullscreen priority.
5. Measure responsiveness and memory on a lower-memory device with large imports, layers and rectangular swatches. A 4000 × 4000 RGBA buffer alone is about 61 MiB; export encoding, history and additional buffers can add substantially. This is a size calculation, not measured app usage.
6. Verify offline cold launch before making that sales claim. Keep the alpha label until release gates have evidence. Check real build history before incrementing Android versionCode.
7. After evidence is collected, update this ledger with device, OS/WebView version, APK version, source/deploy identifiers, steps and observed results. Do not replace unknowns with confidence percentages.

## Continuation instructions for the next chat

Work only on feature/canvas-first-ux-v2 and the named staging site unless the user expands scope. Existing approval covers UX2 testing, fixes, pushes and staging publication. Production/main and an APK/AAB release were not changed in this pass.

Use the current remote branch as the baseline. The old local deployment checkout contains earlier uncommitted changes and must not be reset or blindly uploaded. The latest pass used the isolated worktree ux2-extended-tests, initially based on 6023c41. Source, tests and documentation are saved to the remote UX2 branch through atomic commits; the local detached HEAD itself is not advanced by connector commits. Do not mistake its dirty status for unsaved remote work.

Read mobile/AGENTS.md before mobile changes. Follow its Expo version-specific documentation and validation requirements. Current native source already contains file saving/sharing, fullscreen messaging and Doodle orientation support; do not waste effort rebuilding them from the old readiness document.

The temporary workspace failure was resolved during this pass. Local server and browser test processes need to share a network context in this environment; a server started in a different isolated command may be unreachable. Avoid interpreting connection-refused as an application failure.

The Netlify CLI had no separate login, but the connected Netlify deployment route worked. The static ZIP was uploaded through that connector's provided deployment proxy, then ready status and published assets were checked. Do not request new credentials merely because the standalone CLI reports logged out, and do not store temporary deployment proxy tokens in documentation or git.

For future deployments, package only the intended static site, confirm the exact staging site ID, wait for ready status and verify the published content. The original deployment was testing only; this document is not a launch approval.
