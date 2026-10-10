# Pattern Forge — current work and handover

Last updated: 9 October 2026 (UK). Read this first when continuing the project.
Update this file after every completed stage and before ending each work session.

## Purpose and current stage

Pattern Forge combines a seamless tile editor (Pattern) with a standalone drawing
workspace (Doodle). The current work adds practical editing, reusable motifs,
fill/pressure controls, colourways and physical-scale previews, then verifies
save/reopen, export and mobile usability before release.

**Current stage: the verified advanced Pattern Forge build is live on the
permanent production URL, including the corrected adaptable-master SVG exporter.
Production SVG-fix merge commit:
`65966b5eefe25fe54a9626ccd94f273aa8ca837e`. Netlify production deploy:
`6ac90639c3af3500088ae314`, state **ready**, alias
https://sapiver-pattern-forge.netlify.app/. The web app includes the fluidity
optimisation, count-driven layout templates, global adaptable-master design model,
manual-review Etsy digital-product exporter and valid scalable SVG dimensions.
Android source targets the production URL by default; a fresh APK physical-device
validation remains the next release gate.**

The source feature work and browser hardening have progressed beyond the last
published staging version. Do not restart those features or assume the old
staging interface is the latest implementation.

## Source of truth and publishing boundaries

| Item | Verified state at takeover |
| --- | --- |
| Repository | `sapiverpress-studio/Pattern-forge` |
| Active working branch | `feature/advanced-editing-v1` |
| Latest saved implementation | `b913c812492571ff9b108a5591e7ecc8441e1c8a` — corrected adaptable-master SVG export; subsequent status-only commits may advance HEAD |
| Current branch head before this status update | `543dfa8855e865a959d58b783dbd8ccd51fcd4c5` |
| Incoming development head | `b3c357b50245f770f1caac6660ad1dff80c9027f` — 6 October, 19:51 BST |
| UX2 branch | `feature/canvas-first-ux-v2` at `06a9fdb9da5955b2dc73e58916ba610968ef94e2` |
| Development vs UX2 at takeover | 113 commits ahead, 0 behind; not merged |
| Production/main | `65966b5eefe25fe54a9626ccd94f273aa8ca837e` — verified SVG fix merged 9 Oct 2026 |
| Production URL | https://sapiver-pattern-forge.netlify.app/ |
| Production deploy | `6ac90639c3af3500088ae314`, published 9 Oct 2026; ready |
| Staging URL | https://sapiver-pattern-forge-ux2-staging.netlify.app/ |
| Staging site ID | `b27b1208-9ab0-4166-ad28-661aff39e579` |
| Staging deploy at takeover | `6ac226566d5c6842cea2c5c8`, published 4 October, 11:11 BST; ready |
| Staging source provenance at takeover | Uploaded build; Netlify records no source SHA. Historical handover identifies tested app source `3fb82dc` with later test/documentation commits. |

Jim authorised continuing the work and the proposed staging update on 7 October.
On 9 October Jim explicitly authorised promotion of the verified build to production;
PR #3 was merged into main and Netlify published the permanent production site.
This production approval does not by itself authorise an APK/AAB store release.
Keep advanced editing on its current branch; do not merge into UX2 merely to
publish a staging package. The Android `preview-ux2` profile points to staging;
the default wrapper points to production. An installed APK's effective URL must
be checked, not assumed.

## What has been implemented, and where to find it

The following are implemented in the **development interface**, with browser
regression evidence below. As of the failed 7 October publication attempt, they
are **still not published on the current staging or production sites**. The
staging failure was authentication-only after both packaged-site suites passed.
Availability is different from physical Android validation.

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
| Count-driven seamless layout templates | Pattern → Design setup → Layout templates | V1 implemented: choose 1–30 placements, compare three generated layouts, regenerate alternatives, show non-exporting guides, place selected/all editable elements; grouped motif counts as one |
| Saved variations and colourways, rename/duplicate/compare, batch export | Pattern → Design setup → Variations & colourways | Implemented; export preserves current work |
| Physical-scale preview, units, rulers, view windows and repeat-cell boundaries | Pattern → Design setup → Product-scale preview | Implemented; scale/units/half-drop/brick checks; not a printer proof |
| Etsy digital-product packaging | Pattern → Export → Export for Etsy | Implemented and browser-verified: seam/source checks, Etsy file-limit checks, PNG/JPG/3×3 preview, conditional genuine-vector SVG, README/licence, buyer ZIP splitting, seller listing-image kit; publishing remains manual |

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
| Complete UX audit | **48/48 pass**, 4 advisory layout warnings. Latest GitHub pass at implementation commit `7030c645`: https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37580461473 |
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
The fresh GitHub UX audit also passed:
https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37580461473

### Staging publication attempt — 7 October, 07:28–07:31 BST

Jim explicitly authorised staging publication. Because the connected GitHub tool
does not expose workflow_dispatch and the connected Netlify tool does not expose
deploy/upload, a temporary path-limited one-shot push trigger was added only to
the staging workflow. Trigger commit `41481566981329178bbf49125c128b4516d8c32d`
ran deployment workflow
https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37581692684.

The exact packaged site passed the complete UX audit (**48/48**) and extended
readiness (**31/31**) before publication was attempted. The Netlify step then
failed immediately because `NETLIFY_AUTH_TOKEN` was empty in GitHub Actions.
No Netlify upload occurred. The staging site's current deploy remains
`6ac226566d5c6842cea2c5c8` from 4 October.

The temporary push trigger was removed. The deployment workflow was restored to
manual-only in commit `cca9835fa2df4c77e3cc97c875f03535580db9f9`, and the
one-shot trigger file was removed in
`3ef9b3f51233682430ffb6bdfe635e6a82937bf9`. Production/main was not changed.

Do not change application code to solve this blocker. Restore a valid GitHub
Actions repository secret named `NETLIFY_AUTH_TOKEN`, then run the existing
manual staging workflow from `feature/advanced-editing-v1`.

### Temporary live preview — 7 October 2026

Because the current Netlify connector no longer exposes the direct upload action used for earlier staging API uploads, and the repository Netlify token is absent, a reversible tokenless preview route was used without changing production or the existing UX2 staging site.

GitHub Actions run `37611387875` packaged the exact advanced-editing branch head, then passed the complete UX audit and extended-readiness suites before deployment. Netlify anonymous/drop deploy `6ac62790fbcb3774bb1c8ac9` is **ready** at:

https://symphonious-daifuku-e0e7d2.netlify.app/

Netlify reports five generated pages (`/`, `/help/`, `/app/`, `/app/pattern/`, `/app/doodle/`) and five assets uploaded. This is a temporary anonymous Netlify project, not the permanent UX2 staging project. It must not be described as replacing `sapiver-pattern-forge-ux2-staging`. The temporary trigger and workflow were removed immediately after the successful deploy in commits `1e4df6ca09c1792a4cc35e11afb2dd6afe6ad059` and `466b4eb66a57876aa67f6ecc76352d8dd765b23b`.

### Account-owned Netlify deploy preview — 7 October 2026

To obtain a proper persistent Netlify deployment without the missing GitHub `NETLIFY_AUTH_TOKEN`, draft PR #3 was opened from `feature/advanced-editing-v1` to `main` **only to trigger Netlify's Git-connected Deploy Preview**. The PR must not be merged without Jim's separate production-release approval.

Netlify deploy `6ac629080bd4ba0008708530` is **ready** on the account-owned `sapiver-pattern-forge` project:

https://deploy-preview-3--sapiver-pattern-forge.netlify.app/

Drawer-free fixed deploy permalink for device testing:
https://6ac62939b24e3c00087db755--sapiver-pattern-forge.netlify.app/

Use the fixed deploy permalink for normal app testing because Netlify injects its collaboration Drawer into the `deploy-preview-3` alias.

Netlify records:
- context: `deploy-preview`
- source branch: `feature/advanced-editing-v1`
- source commit: `c7c014e22fbc3120aeaa9555264c67e27da81b3c`
- review: GitHub PR #3
- 22 changed files uploaded, including the root app and help entry pages
- GitHub commit status `netlify/sapiver-pattern-forge/deploy-preview`: **success**

This is account-owned and persistent under the real Netlify project, unlike the earlier one-hour anonymous preview. It does **not** change `main`, the production URL, or the separate `sapiver-pattern-forge-ux2-staging` site. Use this deploy preview as the current live advanced-editing verification target until a separate production/staging publication decision is made.

### Mobile feature discoverability fix — implementation staged

Jim's physical-phone screenshot showed the fullscreen Tools sheet obscuring the
right-side Colour/Layers/Motifs/Setup dock, making the advanced feature work look
absent even though it existed in source. The implementation now keeps that dock
visible and labelled in fullscreen, moves the Tools sheet clear of it, exposes
Colour/Layers/Motifs/Design setup (Canvas setup in Doodle) directly inside the
Tools sheet, and adds concise feature hints to Select/Brush/Fill/etc. Regression
checks were added for Pattern and Doodle fullscreen overlap and workspace
shortcuts. The first CI run exposed two regressions in the initial layout change:
Doodle's widened feature dock moved its context strip over the canvas, and richer
tool-menu copy changed the exact accessible name of tool buttons. Follow-up commit
`2290087d798b4cbcd1f304fd3b2d1f2df2126bc3` keeps Pattern's labelled feature
dock, restores Doodle's compact dock/side-space geometry, and gives tool-menu
buttons explicit accessible names.

Verification on that exact commit is green: package workflow passed; complete UX
audit **48/48 passed, 0 failed** (4 existing advisory warnings); extended
readiness **31/31 passed**, including all Pattern/Doodle viewport checks and the
new rule that the fullscreen Tools sheet must not cover the feature dock. Netlify
Deploy Preview also succeeded for the same commit, deploy
`6ac62cd93329d30008383b6e`.

### Fluidity/render optimisation — verified

Following physical-reference review on 9 October, the editor interaction path was
changed so active drag/draw/resize uses a 540px working tile while idle and export
remain full quality. Pan/pinch captures and reuses a full tile rather than
recompositing unchanged artwork on every movement. Autosave, preview generation,
quality calculation and selection/layer UI rebuilds are deferred until the
gesture ends. Brush/eraser/fill stroke capture consumes coalesced PointerEvent
samples when the browser provides them. Export dimensions, saved project geometry
and the 4000px production pipeline are unchanged.

Implementation commit: `7b0d9653f59f01d8aad2efaa3c3bcee288d87a1c`.
Package workflow `37897997508` passed. Complete UX audit
`37897997512` passed **49/49**, including the new lightweight-interaction
regression. Extended readiness `37897997519` passed **31/31**.

### Count-driven Template Engine v1 — verified and deployed to preview

On 9 October the researched placement-template idea was converted into the simpler
workflow Jim chose: **element count → three visual layout choices → choose one → place/refine**.
Pattern Projects support 1–30 element placements and generate three deterministic
but refreshable composition families: Balanced, Flowing and Feature + fill. “Show me
3 different layouts” advances the generation round while retaining the same element
count. The chosen guide is drawn as numbered wrap-aware placement zones on the canvas,
never enters PNG/SVG exports, and is saved in the editable project. “Place current
elements” moves selected elements when a selection exists, otherwise all visible
unlocked editable elements; a grouped motif counts as one element and remains editable.
No template system is exposed in standalone Doodle.

Implementation commit: `3711649d3ffcbfb52a627c4bf6413a6b4cb4fd24`.
Package workflow `37898879466` passed. Complete UX audit
`37898879384` passed **50/50**, including the count-driven template regression and
the fluidity regression. Extended readiness `37898879387` passed **31/31**.

Netlify Deploy Preview `6ac896ca964e350008f34db2` is **ready** for the same
implementation commit. Drawer-free device-test permalink:
https://6ac896ca964e350008f34db2--sapiver-pattern-forge.netlify.app/

### Etsy digital-product exporter — core implementation staged

The commercial-output brief supplied on 9 October is now being implemented as a
separate exporter that does not mutate the editable design. The current Etsy
instant-download constraints were verified against Etsy Help before coding:
maximum five buyer files, maximum 20 MB each; ZIP/PNG/JPG are supported digital
download file types, while SVG is not a standalone Etsy upload type. Listing
images should be at least 2000 px wide.

Core module commit: `4f1150c7b281f98e1091a03eec259d8826881fcf`.
Visible Export-for-Etsy UI and regression commit:
`543dfa8855e865a959d58b783dbd8ccd51fcd4c5`.

The exporter produces one master seller kit containing Etsy-ready buyer ZIP(s),
three design-only 2400 × 1800 listing images, seller checklist and quality evidence.
Buyer ZIPs contain the same singular seamless design as PNG, flattened JPG, 3×3
repeat preview, README/licence and an optional SVG only when all placed imported
assets are SVG sources. If one buyer ZIP exceeds
20 MB, the exporter splits payloads into up to five individually compliant ZIPs;
an individual payload that still cannot fit blocks export. Etsy publishing is not
automated.

Verification on the exact `543dfa88` implementation:
- Package workflow `37911514158`: **success**.
- Complete UX audit `37911514136`: **51/51 passed, 0 failed**, with the same
  four existing advisory layout warnings.
- The Etsy regression deliberately moves an SVG motif across the tile boundary,
  requires seam continuity to pass, builds the kit, checks the five-file/20 MB
  Etsy limits, verifies PNG/JPG/3×3 preview/vector SVG, verifies the design-only listing
  output and confirms the editable design is unchanged.
- Extended readiness `37911514200`: **31/31 passed**.
- Netlify Deploy Preview `6ac8b3c9548d680008427d38`: **ready**, exact source
  commit `543dfa8855e865a959d58b783dbd8ccd51fcd4c5`.
- Drawer-free permalink for this implementation:
  https://6ac8b3c9548d680008427d38--sapiver-pattern-forge.netlify.app/

### Etsy product simplification — singular adaptable design

Jim rejected the first generated lifestyle/product mockups. The intended Etsy
product is **one adaptable seamless design**, not fabric/wallpaper/cushion/etc.
The Etsy exporter has therefore been simplified:

- no fabric, cushion, wallpaper, wrapping-paper or stationery mockups;
- no physical-size positioning or product-specific claims;
- buyer filenames are now `-seamless-master.png` / `-seamless-master.jpg`
  rather than embedding 4000px/300-DPI language;
- the README explicitly states that raster pixel dimensions describe the master
  file only, not a fixed physical product size;
- SVG remains included when the artwork is genuinely vector-capable, giving a
  resolution-independent option;
- raster-source quality can warn about heavy enlargement but no longer blocks
  export based on a presumed physical DPI target;
- listing output is reduced to three neutral design views only:
  full pattern, exact seamless tile and pattern detail.

Regression coverage now requires exactly those three design-only listing images
and explicitly rejects product-mockup names.

Verification on exact implementation commit
`b7fa95a0879bc613da5dd110526fd5afc26d9842`:
- Package workflow `37923629926`: **success**.
- Complete UX audit `37923630049`: **51/51 passed, 0 failed**.
- Extended readiness `37923629965`: **31/31 passed, 0 failed**.
- Netlify Deploy Preview `6ac8cf2aca4eb500082cfaab`: **ready**.
- Drawer-free permalink:
  https://6ac8cf2aca4eb500082cfaab--sapiver-pattern-forge.netlify.app/

### Global adaptable-master design model

Jim clarified on 9 October that the scale-neutral concept is not Etsy-specific:
**every Pattern Forge design is an adaptable master design**. Physical product
size must never be part of the design's identity.

Implementation staged:
- Design setup replaces Product-scale preview/reference products/cm/in sizing
  with **Master output**: neutral repeat-density preview, master raster dimensions
  and repeat-cell boundaries only.
- Fullscreen Info removes visible physical-size controls and platform-specific
  print profiles. Legacy size/unit fields remain hidden solely so older project
  JSON continues to load without migration risk.
- Source-quality checks report raster enlargement against the master raster
  instead of converting artwork to a presumed print DPI.
- Normal PNG, colourway PNG and project-bundle PNG filenames use
  `-master.png`, not `-300dpi.png`.
- Help/setup/export/footer copy states that raster pixel dimensions describe
  file detail, not physical size. Genuine vector SVG remains resolution-independent.
- New project JSON declares `scaleModel: "adaptable-master-v1"`; legacy
  `dpi: 300` remains for PNG metadata/backward compatibility only.
- Regression tests replace physical-product preview checks with scale-neutral
  master-output tests and repeat-cell geometry checks for straight/half-drop/brick.

First complete UX rerun on commit `86a20ccd9b86b69ea2b59f11d6db50345319f5b9`
reported 48/51 because three assertions still encoded old assumptions: a strict
locator expected only one summary card; one new assertion treated the English
word “in” as the inch unit; and Doodle still expected the intentionally removed
300-DPI wording. Application behaviour was correct in those three cases. Tests
were corrected without changing the scale-neutral implementation.

Verified state:
- Adaptable-master application commit:
  `86a20ccd9b86b69ea2b59f11d6db50345319f5b9`.
- Test/status correction commit:
  `9061204ae221e4af4a313d834a3cd646aa1ae171`; application files are unchanged
  from `86a20ccd`.
- Package workflow `37925047936`: **success**.
- Extended readiness `37925047962`: **31/31 passed, 0 failed**.
- Complete UX audit rerun `37925300165`: **51/51 passed, 0 failed** with the
  same four existing advisory scroll-rail warnings.
- Netlify Deploy Preview `6ac8d2eecfef520007a1236a`: **ready**.
- Drawer-free permalink:
  https://6ac8d2eecfef520007a1236a--sapiver-pattern-forge.netlify.app/

### Production promotion — 9 October 2026

Jim explicitly approved moving the verified build to the permanent Pattern Forge
URL. PR #3 was marked ready, reconciled with the two existing main-history cleanup
commits using a content-neutral merge commit, and merged into `main`.

- Main merge: `a2416897233be865e861982aa4618c9e4bbde3af`
- Netlify production deploy: `6ac8d68fb27b4900091fd3f3`
- Netlify state: **ready**
- Permanent URL: https://sapiver-pattern-forge.netlify.app/
- The production deploy points at the exact main merge commit.
- The tested application tree is unchanged by the history reconciliation.

Android state after promotion:
- package: `uk.co.sapiverpress.patternforge`
- Expo project ID: `53addbf0-0314-4e3e-9120-08fa61a0ee4a`
- source version: `1.0.0`, Android `versionCode: 1`
- default mobile wrapper URL: https://sapiver-pattern-forge.netlify.app/
- EAS `preview` produces an internal APK using the default production URL.
- EAS `production` produces an Android App Bundle (AAB).
- EAS `preview-ux2` still points to the old isolated staging URL and should not
  be used for the next physical-device acceptance build.
- A fresh APK build and real-device checks remain required before calling the
  Android release production-ready.

### SVG adaptable-master export defect — fixed in development

A real Etsy kit inspection found that the SVG root exported
`width="undefinedin" height="undefinedin"`. Root cause: the global
adaptable-master change removed physical `wIn/hIn` values from
`getExportSpec()`, but `renderSVGBlob()` still referenced them.

The development fix now derives SVG intrinsic dimensions directly from the
complete repeat-cell coordinate space and uses **unitless** values plus an
identical `viewBox`:
- straight: `width="4000" height="4000" viewBox="0 0 4000 4000"`;
- half-drop: `4000 × 8000`;
- brick: `8000 × 4000`.

No inch/cm unit is introduced, so this remains consistent with the adaptable
master model. New browser regression coverage rejects `undefined`/`NaN`,
parses the SVG as XML, reopens the straight SVG as an image, and checks
straight/half-drop/brick root geometry.

Verified on exact implementation commit
`b913c812492571ff9b108a5591e7ecc8441e1c8a`:
- Package workflow `37939425592`: **success**.
- Complete UX audit `37939425520`: **52/52 passed, 0 failed**.
- Extended readiness `37939425514`: **31/31 passed, 0 failed**.
- The Etsy boundary-crossing regression passes with the corrected SVG.
- Straight SVG parses and reopens as an image with
  `width="4000" height="4000" viewBox="0 0 4000 4000"`.
- Half-drop and brick root dimensions/viewBoxes are also explicitly covered.
- Production remains unchanged; deployment still requires Jim's separate
  explicit approval.

### SVG fix production promotion — 9 October 2026

Jim explicitly approved production deployment of the verified SVG fix. PR #4
merged the development branch into `main`.

- SVG implementation commit: `b913c812492571ff9b108a5591e7ecc8441e1c8a`
- Verified development status commit: `b380e46a819cd1a7d002ce4657649f7402915f42`
- Production merge: `65966b5eefe25fe54a9626ccd94f273aa8ca837e`
- Netlify production deploy: `6ac90639c3af3500088ae314`
- Netlify state: **ready**
- Permanent URL: https://sapiver-pattern-forge.netlify.app/
- Netlify `commit_ref` exactly matches the production merge.
- The corrected production SVG root uses unitless intrinsic dimensions and a
  matching viewBox; the former `undefinedin` defect is removed.

### Android camera/cutout safe-area fix — development

A real Android landscape screenshot showed the Doodle tool rail starting at the
physical screen edge, so a front-camera/display cutout can cover the left-side
controls. The web app's CSS safe-area environment is not sufficient inside the
current Android WebView shell.

Development fix:
- Expo SDK 57 recommended `react-native-safe-area-context ~5.7.0` added.
- The native shell now wraps the WebView in `SafeAreaProvider` +
  `SafeAreaView` with **left/right** safe edges.
- The WebView therefore starts after the actual Android cutout inset on whichever
  side the camera occupies after rotation.
- Top status-bar handling remains unchanged and fullscreen still removes the
  manual top padding; horizontal cutout protection remains active in fullscreen.
- This is device-adaptive, not a hard-coded pixel offset, so phones/tablets without
  a cutout do not lose arbitrary canvas space.
- The currently installed APK cannot receive this native-wrapper change from the
  website alone. A new preview APK is required for physical validation before
  Android release readiness can be claimed.

Initial verification exposed a stale Expo lockfile after the safe-area package
was introduced. The mobile lock was regenerated from the declared SDK 57
dependencies, yielding Expo 57.0.27, @expo/cli 57.0.28, @expo/config 57.0.10 and
@expo/metro-config 57.0.13.

Verified checkpoint:
- Native safe-area implementation commit:
  `5ef6ed810f8c922c5bade02b2e02d46cd293de7c`.
- Clean SDK dependency lock commit:
  `81a0ec556d1426439aa17f360f604577fc693880`.
- Exact verification trigger:
  `5f78214ae63681f0406d1705a5a615048c456796`.
- Mobile wrapper verification run `38031329634`: **success**.
- `npm ci`: **pass**.
- TypeScript (`tsc --noEmit`): **pass**.
- Expo Doctor: **21/21 checks pass**.
- Expo SDK 57 official safe-area dependency is
  `react-native-safe-area-context ~5.7.0`.

The fix is development-source verified but still requires a fresh APK and a
physical landscape rotation test on the actual cutout device. Production website
and the currently installed APK remain unchanged.

### Preview APK 1.0.1 build — approved

Jim explicitly approved building a fresh internal Android preview APK after the
camera/cutout safe-area fix passed source verification.

Build target:
- app version: `1.0.1`
- Android versionCode: `2`
- package: `uk.co.sapiverpress.patternforge`
- EAS profile: `preview`
- output: installable APK, internal distribution only
- hosted app URL: https://sapiver-pattern-forge.netlify.app/
- purpose: physical-device validation of camera/cutout clearance, rotation,
  fullscreen, Android Back and export/file handling.
- This approval is for the preview APK only; it is not Play Store/AAB approval.

Build pending.

## Remaining work, in order

1. **Physical-device check of the latest build:** use the drawer-free deploy
   permalink above on the intended Android phone/tablet. Verify fluid drag/draw,
   Template Engine controls and the Export for Etsy panel at real mobile scale.
2. **Real-product Etsy export check:** finish or open a representative pattern
   with edge-crossing motifs, run Export for Etsy, extract the master kit and
   inspect every buyer file plus the three design-only listing images. Confirm the seam check
   agrees with visual inspection and the listing mockups are good enough to sell.
3. Review the default Sapiver Prints README/licence wording and design-only listing styling
   against the actual shop offer. Change wording/style only where Jim wants it;
   do not weaken file/repeat validation.
4. The old isolated UX2 staging site still needs a restored
   `NETLIFY_AUTH_TOKEN` if that exact staging URL is required again. This is no
   longer blocking account-owned Deploy Preview testing.
5. Production merge/deploy, APK/AAB release, or Etsy publishing requires explicit
   separate approval from Jim.

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
- Extract one generated Etsy master kit on-device. Open the buyer PNG/JPG/repeat
  preview, inspect any included SVG, confirm all upload ZIPs are visible and below
  20 MB, and inspect the three 2400 × 1800 design-only seller listing images.
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
