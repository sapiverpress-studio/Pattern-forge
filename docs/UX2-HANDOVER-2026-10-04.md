# Pattern Forge UX2 — completion audit and handover

Updated 4 October 2026 after the staging deployment published at 09:39 BST.

## Current outcome

The pending fullscreen Export and backup notice fixes are published to UX2 staging. The editor browser suite and all 11 underlying engine smoke tests passed locally. The corrected engine workflow also passed in GitHub Actions. This establishes a tested web staging build, not Android release approval.

## Exact project and deployment

| Item | Value |
| --- | --- |
| Repository | sapiverpress-studio/Pattern-forge |
| Working branch | feature/canvas-first-ux-v2 |
| Tested application commit | dd82eadab1098a40013dec6de51252358a04dc2b |
| Corrected test/workflow commit | d4fd8ccb68efd622eeebb3c8934dbe3af6b9d6aa |
| Staging site | https://sapiver-pattern-forge-ux2-staging.netlify.app/ |
| Staging site ID | b27b1208-9ab0-4166-ad28-661aff39e579 |
| New deploy ID | 6ac210a41b9c57e90eb9f3fa |
| Build ID | 6ac210a41b9c57e90eb9f3f8 |
| Previous staging deploy | 6ac1f26c69bdac7a039c9631 |
| Deployment verification | Netlify state ready; published CSS and JavaScript match tested local files byte for byte |

Deploy permalink: https://6ac210a41b9c57e90eb9f3fa--sapiver-pattern-forge-ux2-staging.netlify.app/

The upload contained index.html, _headers, manifest.webmanifest, assets/, app/ and help/. No mobile build was uploaded. Netlify labels publication to this site's primary URL as production context; this is the separate staging site, not the product's production site.

Documentation commits after the test/workflow commit do not change the deployed application. The manual GitHub deploy workflow is still pinned to an older application commit and must not be dispatched as a shortcut to deploy the current branch without reviewing that pin.

## Requirements compared with current evidence

This baseline comes from the visible conversation and repository. It is not an independently recovered original business specification; unrecorded requirements must not be marked complete.

| User intent | Current state | Evidence / remaining qualification |
| --- | --- | --- |
| Doodle is standalone; no project creation options | Direct Doodle opens or restores without a creation decision | Doodle and editor browser tests pass |
| Tools remain usable in fullscreen | Creative tools, Tools menu, Colour, Layers and Canvas setup remain available | Editor test passes at desktop and 844 × 390 landscape |
| Zoom left of favourites and clear of camera area | Grouped landscape Doodle layout is deployed | Bounds assertions pass; physical cutout still needs a phone check |
| Persistent favourites chosen from full Tools menu | Stored locally under patternForgeUx2FavouriteTools; selected tools form quick rail | Source present; first-use defaults Brush, Erase and Pan; saved empty selection preserved |
| Mirror and drawing assists available in Doodle | Mirror, grid, guides and snap exposed in Canvas setup | UI selects real mirror control; mirrored PNG pixel check passes |
| Doodle edges do not repeat | Unmirrored edge-crossing artwork clips to standalone canvas | Transparent opposite-edge PNG sample passes |
| Line connect is for later | Deferred requirement | Do not interpret the existing Line shape as completion of line-connect functionality |
| Full visual/coherency pass | Targeted desktop and landscape browser checks completed | Broad accessibility, all screen sizes and physical Android visual approval remain open |
| Fix, test and update audit | Fullscreen Export and local-backup notice deployed; obsolete tests corrected | Local suites and GitHub engine workflow pass |
| Business analysis and release readiness | Evidence-based assessment below | Pricing, customer demand and commercial packaging remain unvalidated |

## Changes completed in this pass

Fullscreen now retains Export in Pattern and Doodle. The Export panel explains that autosave remains on the current device and asks users to save a project file before clearing app or browser data.

The initial engine failure was an obsolete requirement: the test enabled quadrant mirror and then asserted that no reflected artwork should appear on the opposite edge. Doodle now intentionally supports mirror. The repaired test first disables mirror and proves edges do not wrap, then enables vertical mirror and proves the reflected PNG pixels exist. Export, transparency, save and restore assertions remain in place.

The Doodle test no longer expects the removed project-menu flow. Layer tests explicitly exercise the legacy controls and then reopen the same saved work in the visible UX2 shell. Workflow URL adaptation now preserves explicit query strings and workspace routes.

No engine code was weakened to satisfy the obsolete test. No new mobile build was produced.

## Verification ledger

| Check | Result |
| --- | --- |
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
| Published CSS and shell JavaScript compared with tested files | Exact byte match |
| Physical Android APK download, reopen, memory and system controls | Not run in this pass |

CI evidence:

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

Use the current remote branch as the baseline. The old local deployment checkout contains earlier uncommitted changes and must not be reset or blindly uploaded. This pass used an isolated worktree at ux2-release-verified based on dd82ead, with the three test/workflow changes also saved to GitHub.

Read mobile/AGENTS.md before mobile changes. Follow its Expo version-specific documentation and validation requirements. Current native source already contains file saving/sharing, fullscreen messaging and Doodle orientation support; do not waste effort rebuilding them from the old readiness document.

The temporary workspace failure was resolved during this pass. Local server and browser test processes need to share a network context in this environment; a server started in a different isolated command may be unreachable. Avoid interpreting connection-refused as an application failure.

The Netlify CLI had no separate login, but the connected Netlify deployment route worked. The static ZIP was uploaded through that connector's provided deployment proxy, then ready status and published assets were checked. Do not request new credentials merely because the standalone CLI reports logged out, and do not store temporary deployment proxy tokens in documentation or git.

For future deployments, package only the intended static site, confirm the exact staging site ID, wait for ready status and verify the published content. The original deployment was testing only; this document is not a launch approval.
