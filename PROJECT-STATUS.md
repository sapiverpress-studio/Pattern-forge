## 22 October 2026 — Nested ZIP motif folders and global search LIVE and verified

**Released:** The source branch `feature/nested-motif-search-20261022` was promoted to `main` by safe fast-forward from `8e68ad564bc0df156e090c11dc2cabcb3d8082cd` to `6010a23823bfc2ba7bd07fde418e642eb3958f4d`. Netlify **production**, site `sapiver-pattern-forge`, published deployment `6ad9b1dae5eaf60ece65ce4d` as **ready**, commit `6010a23823bfc2ba7bd07fde418e642eb3958f4d`, on 2026-10-22T06:49:04Z. Published URL: https://sapiver-pattern-forge.netlify.app/. No staging or Android APK/AAB build was modified.

**Feature locations:** `app/js/motif-packs.js` reads the complete PNG relative path from nested ZIP archives or supported native folder pickers; `app/js/editor.js` saves optional `relativePath` and `categoryPath` in existing IndexedDB records, allows the same filename in different subfolders but prevents duplicate paths within one named collection, and preserves existing flat motifs. `app/js/canvas-first-v2.js` adds a **Search every collection** field and hierarchical **Subfolder** selection beside the existing Collection dropdown. Typing `fox` searches names, filenames, collection and all folder/category paths across every collection regardless of selected folder filters. Clearing search restores the filters. Importing a ZIP rooted at `Woodland_creatures/` creates that default collection and retains nested categories `Fox/`, `Hedgehog/`, `Doe/` etc; a manually entered collection name overrides the root. The established max 100 files, genuine RGBA transparency and no-auto-placement requirements are unchanged.

**Tests:** [development CI run 39736044054](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/39736044054) completed **SUCCESS** with two green jobs: 5 motif/import/browser scenarios, 3 existing multi-image cases, 4 exporter modes and 31/31 extended editor regression cases. [LIVE HTTPS browser run 39736386965](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/39736386965) completed **SUCCESS** against the published site: real ZIP stored/deflate hierarchy, identical basenames in different animal subfolders, global Fox search across collections, filtering, IndexedDB persistence and alpha guards. Those are Chromium desktop/Android-emulated browser tests, **not a physical Android device benchmark**. The one-time verification workflow was removed after passing using a `[skip netlify]` documentation-only commit; the released production site retains the same tested code. No new starter motif artwork was produced in this release. Retain original ZIP archives because motifs persist locally on each device.

## 22 October 2026 — Nested motif ZIP folders and global search (DEVELOPMENT; publication pending)

**Request:** accept nested categories within one ZIP such as `Woodland_creatures/Fox/sitting.png`, `Woodland_creatures/Hedgehog/sitting.png`, `Woodland_creatures/Doe/sitting.png`; searching `fox` must find all Fox motifs across ALL imported collections. No changes to the 5000px export contract.

**Source branch:** `feature/nested-motif-search-20261022` based on the then current published `main` `8e68ad564bc0df156e090c11dc2cabcb3d8082cd`. Files: `app/js/motif-packs.js` (preserve ZIP relative file paths, native folder relative paths, derive root collection + nested category names; reject unsafe paths and duplicates by relative path), `app/js/editor.js` (persist `relativePath`/`categoryPath` in existing IndexedDB motifs without schema migration, collision-safe duplicate detection), `app/js/canvas-first-v2.js` (global search across motif names, source filenames, collection and full nested folder paths; parent/child subfolder browse; search overrides collection filters; result count), `tests/motif-collection-browser.mjs` (new automated browser cases), `.github/workflows/nested-motif-search-checks.yml` (branch-only QA), `docs/MOTIF-COLLECTION-FOLDERS.md` (instructions). Current My Motifs local library, project isolation, and existing flat motif entries remain compatible.

**Verified staged tests so far:** on source SHA `b58e4f971356f7c66cd889c61d991901ce04317d`, run [39736044054](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/39736044054) motif-folders job **SUCCESS**: 5 motif/browser tests, including nested stored/deflated ZIPs, 100 PNG baseline, real RGBA transparency, same filenames in distinct animal folders, search across two collections despite filters, old collection and new nested folder browse, save/reload and native folder metadata; 3 existing multi-image batch import cases. Extended editor regression job still pending completion at this ledger entry; do not claim overall CI succeeded until confirmed. Browser tests include Android-emulated viewport, not physical Android device.

**Release boundary:** code not yet merged to `main` or published at this checkpoint. Once both CI jobs succeed and changed paths are reviewed against current `main`, use one safe fast-forward of `main`; verify Netlify's production source SHA, then run live HTTPS browser checks on the actual production site. Do not deploy native Android APK/AAB, staging, other sites or schedule background processes. Original illustrated 25-motif starter pack remains uncreated; this work handles file management/search only.

## 22 October 2026 — 5000px exporter and 100-motif importer LIVE; tested on production

**Source QA:** branch code at `7390fa5e159108754ed34e64d1d787d76b2cc070`, [GitHub Actions run 39730344933](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/39730344933): **SUCCESS**. Two independent jobs passed: 100-file persistent RGBA motif collections, compressed ZIP/filename validation, original six/twelve-image workflows, 5000×5000 straight PNG, 5000×10000 half-drop, 10000×5000 brick, 5000×5000 transparent Doodle, 300 DPI pHYs, seam wrapping, legacy formats, and all 31/31 extended readiness checks. Original source commit `db571603a70ecdd542f036b62b66bf9be9b9ad6d` was fast-forwarded to `19fe1a1157ba15ffe7f584daec686ef1d8345bdb` without force pushing.

**Production:** Netlify project `sapiver-pattern-forge` published deploy `6ad9a73731140e22bf2b7685` at 22 October 2026 06:03 UTC, **ready**, source `7910e6634e7a5943e6a6badf8a0ec259cb970d2a`, branch `main`. Its editor code is the audited commit above; intermediate commits after 7390 only changed docs / temporary release workflows. Public site: https://sapiver-pattern-forge.netlify.app/. Crucially, a separate Actions run [39731787815](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/39731787815) tested the **actual published HTTPS URL** and finished **SUCCESS**: all three RGBA/ZIP/100-motif browser scenarios, four 5000px raster/300DPI/seam/Doodle export scenarios. These tests include Android-emulated viewport, not a physical Android handset. **The source features are published and browser verified.**

**Release nuance:** Two attempted manual Netlify CLI workflow runs [39731264185](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/39731264185) and [39731437394](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/39731437394) were blocked before publication because GitHub secret `NETLIFY_AUTH_TOKEN` was absent; however, Netlify's existing production Git integration independently published the checked main branch and live checks passed. The production release artifact is preserved as `pattern-forge-5000px-release-site`, artifact ID `12405545461`, and downloadable in chat as a backup. The two one-time workflow YAMLs were removed after the live release with `[skip netlify]` commits, preventing redundant uploads. Do **not** request token setup or manual deployment for this already published release. No APK/AAB was built or released, and the staging site was not changed.

**Feature locations:** On the production website My Motifs panel includes named collection import of 1–100 8-bit RGBA PNGs, PNG multi-file picker, compressed ZIP folder and optional native folder picker (browser support varies), collection filtering, duplicate rejection, persistent IndexedDB library and source image insertion into projects. The exporter now renders **actual full 5000px source content**, not just a 5000px canvas with 4000px artwork, across PNG, SVG and Etsy JPG. The planned original illustrated **25-motif starter pack has NOT been created or bundled**; don't claim built-in artwork exists. Imported motifs are local to the device; original PNG/ZIP files require separate backup. Repeated manual collection imports require no further website deploy. The existing editor remains unchanged for other features.

**Next:** develop/quality-review the original 25 transparent starter motifs as a separate ZIP pack, optionally test actual Android phone/browser folder selection and memory when importing 100 high-resolution artwork files (synthetic 100-file browser tests do not establish low-memory Android limits). No repeat production deployment is required to import a future ZIP.

## 22 October 2026 — 5000px exporter + manual 100-motif collection import: TESTED, release checkpoint

**Owner approval:** "do this on the same branch as the 5000px exporter, test and deploy" and "Do whatever tests are necessary"; subsequently requested manual addition of folders of ~100 motifs. Applies to this website branch only, not an Android APK/AAB, Replit, Poster_gen or automatic recurring deployments.

**Source and implementation:** existing `feature/5000px-seamless-export-20261021`; verified source at `7390fa5e159108754ed34e64d1d787d76b2cc070`. Built direct 1–100 PNG file importer, native folder input on browsers that allow it, compressed or stored ZIP folder reader, strict 8-bit RGBA PNG header and transparent-edge testing, named persistent IndexedDB My Motifs collections, collection filters and duplicate rejection. Import does not place motifs on canvas or bloat current project; insertion preserves editable move/scale/rotate, and saved art remains compatible. Added `app/js/motif-packs.js`, integrated into `app/js/editor.js`, `app/js/canvas-first-v2.js`, `app/index.html`, and tests/workflow. `app/js/editor.js` now truly renders 5000px logical repeat-cell content across PNG and SVG instead of scaling 4000px into a larger blank canvas; `app/js/etsy-export.js` JPG master receives same fix. Existing saved projects retain their legacy format; legacy project tests pass. Doodle master stays transparent. **The proposed 25 original illustrated starter PNGs are NOT created or bundled; do not advertise a populated default library.** Future collection ZIPs can be imported with no new site deployment. Original source files need to be backed up separately, because the IndexedDB library lives only on the current device.

**Verified CI:** [GitHub Actions run 39730344933](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/39730344933) completed **SUCCESS** on source commit `7390fa5e159108754ed34e64d1d787d76b2cc070`. Motif job: 100 PNG motifs in named folder, duplicate protection, IndexedDB persistence, collection ZIP and Android-emulated viewport, real RGBA/alpha guards, non-destructive independent placement, three existing batch-image import regressions. Export job: 5000×5000 straight, 5000×10000 half-drop, 10000×5000 brick, 5000×5000 transparent Doodle, single 300-DPI pHYs, straight seam wrapping, old project compatibility, full 31/31 editor readiness checks including large-load stress scenario. Early test run `39729964795` exposed and blocked a *real* 4000px content-to-5000px canvas scaling error, now corrected and green; the hidden Doodle repeat-selector test fixture was corrected. These are real Chromium browser tests, **not physical Android tests**. This checkpoint documents source QA, **not proof that Netlify deployed it**.

**Release scope:** one production WEBSITE publication of the validated code is authorised; protect main with a checked fast-forward from the exact previous main SHA, verify Netlify source commit and live loading before claiming success. Keep separately generated motif artwork out of the release claim. If Netlify auto-deploy does not run, do not imply production is live. Do not release an APK or AAB. Preserve staging.

## 21 October 2026 — Motif library request and exporter release gate (INVESTIGATION ONLY)

Owner authorised implementation, testing and deployment of the first 25 alpha-transparent mixed-style motifs on the existing `feature/5000px-seamless-export-20261021` branch, alongside the 5000px exporter. This session verified branch head `0cb8827aebaf661172b0beca68b1230d44204f89`, open PR #7 (unmerged), and inspected the actual UX2 My Motifs and Images interfaces. Existing My Motifs stores editable selections locally; Images supports multi-file import and complete backups, but there is no verified manifest-driven ZIP motif collection importer. The 25 new finished 2048px RGBA artworks do not exist in the branch. The existing exporter PR explicitly states live export/DPI/seam tests are outstanding. **No new motif importer, artwork, tests, or production/staging release was completed in this investigation. Do not deploy or merge this feature on the basis of this session.** Next: produce and alpha-validate 25 original RGBA PNGs; build collection ZIP parser integrated with existing Images UX, preserve My Motifs and saved projects, run browser/import/alpha/export regression tests, then verify a controlled staging deployment before production publication.

# Pattern Forge — current work and handover

## 13 October 2026 — Shape Clean production website release approval checkpoint

**Explicit user approval:** The owner said **"Deploy it"** after confirmation that Shape Clean passed testing but was not yet on the live app. This authorises **one controlled release of Shape Clean to the existing production Netlify website**, not an Android APK/AAB build, a staging deployment or unrelated Etsy/PrintShrimp work.

**Verified gate before publishing:** `main=ad959a7bdc974b9487eed52758f35ee7941714ad`, latest ready Netlify production `6acda2f7da3b19f5e0cdb7bf`, release branch `feature/shape-clean-20261013` fast-forwardable without any intervening production changes. Workflow [38363878909](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/38363878909) finished **SUCCESS** (six geometry classes + rejection safeguards, 2/2 complete editor flows, transparent Doodle PNG/SVG and 31/31 legacy editor regressions). Changes after the tested commit `0a62d39d316f0cf50413d059b4037da1c6bb9611` only modified this handover markdown file. Code file scope: `app/js/shape-clean.js`, `app/js/editor.js`, `app/js/canvas-first-v2.js`, `app/index.html`, `app/assets/canvas-first-v2.css`; isolated test, workflow and handover files only. **This approval checkpoint is not a claim of successful deployment.** Promote using fast-forward with expected old SHA; verify Netlify exact new SHA and live editor browser behaviour. Record post-deployment evidence separately on the feature branch to avoid a second production deploy from a documentation-only main commit.


## 13 October 2026 — Shape Clean / Doodle transparent exports (DEVELOPMENT ONLY)

**User request:** User provided an Android screenshot of an imperfect drawn circle and requested a *single small “Shape Clean” button* to perfect a pen-drawn circle, square, rectangle or triangle at the same position and overall dimensions, rather than switching tools and redrawing. User also established **transparent Doodle SVG and PNG exports** as non-negotiable for later sticker/doodle pack work. The Etsy/PrintShrimp shop architecture is being handled in a separate chat; no Etsy work in this stage.

**Implementation:** Branch `feature/shape-clean-20261013` created from published `main` source `ad959a7bdc974b9487eed52758f35ee7941714ad`; live Netlify deploy was `6acda2f7da3b19f5e0cdb7bf` ready. Added a permanent compact **Shape Clean** button in the canvas-first top actions beside Undo/Redo, plus a legacy button. It cleans either a single selected eligible freehand brush mark or, with nothing selected, the latest eligible drawn brush mark. `app/js/shape-clean.js` fits near-closed circular/oval, square/rectangle and triangular outlines and refuses open marks and looping scribbles without modifying them. All candidates are compared by relative fit to preserve the source outline type; original line position/width/height is retained within the slight geometric correction needed for true circles/squares, and the same colour, stroke thickness, layer, and opacity are retained. The cleaned circle/oval is a native editable ellipse, square/rectangle a native editable rectangle, and triangle an exact closed vector-stroke polygon. The converted mark stays hollow, becomes selected with Select tool active, saves as an ordinary editable mark, supports transforms and undo to recover the original rough mark. No background is added to Doodle exports.

**Files:** `app/js/shape-clean.js` (new standalone geometric fitter), `app/js/editor.js` (non-destructive action, UI event, selection/undo integration), `app/js/canvas-first-v2.js` (single top toolbar button), `app/index.html` (script load order and legacy button), `app/assets/canvas-first-v2.css` (compact responsive button), `tests/shape-clean-geometry.test.mjs` (six shape classes, open/stroke/scribble guard), `tests/shape-clean-browser.mjs` (circle/triangle exact SVG, PNG alpha, editable JSON, undo/redo), branch-only `.github/workflows/shape-clean-checks.yml`.

**Testing evidence:** [CI 38363878909](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/38363878909) pure-geometry **passed**: rough circle, oval, rectangle, square, upright and angled triangle, rejection of open C/stroke/scribble, no mutated inputs. Browser end-to-end **passed**: one tap circle in Pattern, SVG vector export, colour/width retention, JSON reopen and undo/redo; triangle in Android-sized Doodle and SVG as hollow vector plus PNG with alpha=0 at transparent corner (source Doodle internal `TILE=900`, export 4000 px). Earlier automated runs were unsuccessful due intentional test guard fixing and synthetic pixel-vs-internal-unit fixture issues; no source regression. The extended regressions completed **31/31 PASS**, so the whole workflow run **38363878909 finished SUCCESS**. Browser tests are Chromium desktop plus mobile-emulated viewport; these are not physical Android device tests.

**Deployment boundary:** **NOT DEPLOYED**. User asked to add and perfect the editor tool, not to publish this change yet. Do not change production `main`, deploy Netlify staging/production or release Android APK/AAB without explicit release approval. Native app and existing saved projects remain untouched. Next: confirm final 31 existing editor tests, update this ledger with exact result, and ask owner before a controlled deployment.


## 13 October 2026 — Raised oil / piped / knife production WEBSITE release authorised

**Explicit owner approval:** Responded “Yes” to offer to deploy the three tested oil, icing and palette-knife brushes to the live Pattern Forge website. Scope is exactly one controlled production website deployment of `feature/raised-impasto-brushes-20261012`, NOT a native Android APK/AAB build, staging publication or unrelated Poster_gen/Etsy changes. Source and branch checked: `main=102b8be264612fa53e9dddc903eb4c83e0d95645`, release branch fast-forwards from it, prior production deploy `6acc8d29088aa40008fef2eb` was ready. Changed paths reviewed: `app/js/raised-paint.js`, `app/js/editor.js`, `app/js/canvas-first-v2.js`, `app/index.html`, `app/assets/canvas-first-v2.css`, branch-only unit/browser tests/workflow, and this handover file. Existing CI 38285792103 passed 3/3 brush geometry, 4/4 browser flows, 31/31 existing regressions. **Approval recorded before deployment; don't mark live until Netlify SHA and public web tests are confirmed.** On release, make only a safe fast-forward `main` ref update; keep later final handover changes on isolated source branch to avoid an unnecessary second deployment.


## 12 October 2026 — Raised impasto, piped-paint and palette-knife brushes (DEVELOPMENT ONLY)

**Source branch:** `feature/raised-impasto-brushes-20261012`, based on the existing published production site source `102b8be264612fa53e9dddc903eb4c83e0d95645`. User provided `47239.mp4` (25.7-second reference video of an iPad artist producing orange pumpkin relief ridges and smooth white ghost shapes). Request: "Can we add big thick oil paint textures brushes, these almost look like icing". Interpretation: add 2D vector/canvas pseudo-3D raised paint, not reproduce video imagery or replace existing brushes. **No production, staging, or Android release authorisation was given**.

**Implemented:** New styles **Oil impasto** (`brushStyle=impasto`), **Piped paint** (`piped`), **Palette knife** (`knife`) in the canvas-first Brush tool style selector and Brush Library and legacy style selector. All use `app/js/raised-paint.js`: shared deterministic vector relief ribbon geometry, layered light/dark pigment ridges, raised edge and darker underneath, pressure-dependent thickness, relief/texture slider; pressure and existing Strong stabilisation remain respected. Preset selection increases a formerly tiny brush to approximately 130–170 export pixels and relief to 80% so the new effect is noticeable straight away. User can subsequently adjust thickness from 2–400 export px and relief 0–100%. Canvas paints and SVG exports originate from the same editable geometry (no flattened preview or raster substitute); original `m.points` remain saveable/editable with existing transforms, wrapping, symmetry, undo/redo. 2D shading simulates depth; it does **not** produce a true printable height/depth map or 3D mesh.

**Files:** `app/js/raised-paint.js` (new shared brush engine), `app/js/editor.js` (render and SVG export integration and selection hit radius), `app/js/canvas-first-v2.js` (new brush cards/context controls), `app/index.html` (legacy brush options, load order), `app/assets/canvas-first-v2.css` (styled brush thumbnails), `tests/raised-paint-geometry.test.mjs`, `tests/raised-paint-browser.mjs`, branch-only CI `.github/workflows/raised-paint-checks.yml`. Other apps and integrations untouched.

**Final testing VERIFIED:** CI [38285792103](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/38285792103) finished **SUCCESS**. **3/3** style geometry tests (canvas ribbons, deterministic true-vector SVG, relief control, stylus pressure), **4/4** real full-app Chromium browser flows (Oil impasto/Piped paint/Palette knife SVG drawing and distinct shading, undo/redo, save/reopen; Doodle mobile-viewport PNG/SVG, 4000 px output), **31/31** existing project/editing/export/roundtrip/performance regressions; zero regression failures. All source syntax checks passed. The earlier CI attempt [38285733074](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/38285733074) failed because the test mock did not implement real Canvas opacity save/restore and was fixed; not a production issue. Physical Android finger/stylus responsiveness has not been tested.

**Release boundary:** **NOT DEPLOYED.** The previously published production Netlify deploy is `6acc8d29088aa40008fef2eb` (ready), the batch-import website release. Do not move `main`, publish Netlify staging/production or build/release APK/AAB without owner release authorisation. Next action: finish/read existing readiness checks, document precise results and obtain explicit authorisation for a controlled preview or production web deployment. Android `preview-ux2` still points to separate staging.


## 12 October 2026 — Batch image import production release approval checkpoint

**Owner explicitly authorised** one production website release: “Deploy and tell me how to update the app.” This supersedes the earlier release hold for the batch-image library only. Tests previously passed 3/3 batch scenarios and 31/31 existing regressions in CI [38217639262](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/38217639262). Before release, main source was `0f0b8fe22f003b1e11a8e4383c38568ab4f5dfa8` and the published Netlify deploy was `6acc841433e9f70008e78ca0`. This checkpoint **does not claim deployment is complete**. Fast-forward main only after checking the exact files; verify the new Netlify commit and live browser separately. Do not merge Poster_gen or build a new Android APK/AAB. Standard `preview` Android WebView uses production Netlify URL and receives the updated hosted editor upon restart; `preview-ux2` points to staging, so it cannot receive this production change without replacement.


## 12 October 2026 — Multi-image library and 5+ image selection (TESTED, NOT DEPLOYED)

**Scope:** User asked to import five or more images at once. The existing HTML file picker had `multiple`, but canvas-first UX2 launched the picker without a visible image library. Only the first file was placed; other imported files were not accessible from the primary UX2 controls. Compact downloads intentionally omit unplaced images, risking loss on transferring work. This stage fixes the actual user workflow and adds a backup without changing the established compact export.

**Implementation:** Isolated branch `feature/batch-image-library-20261012` off production `0f0b8fe22f003b1e11a8e4383c38568ab4f5dfa8`. The **Images** tool now opens a visible library with **Choose images (5 or more at once)**, previews with image dimensions and placed-copy counts, **Add to canvas**, **Remove**, and **Back up project + all images**. The first successfully imported image is placed automatically, while others remain individually reusable. Handles any batch size subject to device memory, processes each file with progress, skips corrupt/unsupported files without discarding good ones, and resets the picker to permit subsequent selections of the same files. Full-library backup contains unused images and the complete editable project; existing compact exports keep their original semantics. No change to the native Android source, Etsy, PrintShrimp or Poster_gen.

**Files:** `app/index.html`, `app/js/editor.js`, `app/js/canvas-first-v2.js`, `app/assets/canvas-first-v2.css`, `tests/multi-image-import-browser.mjs`, and branch-only `.github/workflows/batch-image-import.yml`.

**Testing:** [GitHub Actions run 38217639262](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/38217639262) passed **3/3 browser scenarios** (six images with individual placement and complete backup/reopen; 12 plus five more images on Android-emulated viewport and invalid-image recovery; Doodle five-image import and backup), plus **31/31 existing extended-readiness tests**. The Android native file picker was not physically tested; some Android providers may handle multiselect differently.

**Deployment:** **NOT DEPLOYED**. Production Netlify was independently read and remains `6acc841433e9f70008e78ca0` in **ready** state. User has not expressly authorised deploying this separate feature. Do not merge to `main`, deploy Netlify or release an APK/AAB without permission. Next action: obtain release approval, perform one controlled web deployment, and test actual Android photo/file selection.


## 12 October 2026 — Image dragging usability fix (TESTED, NOT DEPLOYED)

**Working branch:** `feature/responsive-image-drag-20261012`, based on the already published production web commit `cd69f4174550b476bae5988925e5c06ee77d27dd`. **The code is implemented and CI-tested only. Do not claim it is live.** The last read-back of production Netlify site `sapiver-pattern-forge` remained deploy `6acc7c9c9f99880008db10d4` (ready) and the unfinished Poster_gen handoff PR #6 remains wholly separate.

**User report:** "Drag image is not good/sensitive enough" and "They're not moving at all when selected." Two concrete source defects were found: (1) importing/placing an image set `selectedId` and drew selection handles but did **not** change the active drawing tool, so the image looked selected while Brush or Eraser continued to draw/erase instead of moving it; (2) image dragging applied Smart Snap every pointermove frame, pinning tiny finger movements to the grid. Small mobile images also had unforgiving exact hit rectangles, and the image move handle used the old sticky snapping transform.

**Implementation:** `app/js/editor.js` now activates **Select** when imported artwork or a new image-library copy is placed; correctly synchronises the legacy and canvas-first UX2 tool controls; grabs any visible image body for normal touch dragging; adds a small 18 CSS px touch / 10 CSS px pen halo to selected/touch-target images after testing exact artwork hits; makes all image moves follow finger/mouse directly during drag; shows snap guides while moving and only applies final snap to longer, deliberate drags (at least 24 CSS px), preserving exact short nudges. The dedicated **Move** handle uses the same responsive path. Selected-group and explicit transform handle paths are preserved. `app/assets/editor.css` indicates image dragging with a grabbing pointer on capable devices. Existing project data schemas and saved work are unchanged.

**Verifiable regression evidence:** branch-only GitHub Action [38213831486](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/38213831486) **completed SUCCESS**, with **7/7 direct real-pointer Chromium scenarios** (desktop 8 px mouse, Android-emulated touch short/long drags, Doodle, move handle, tiny-image finger hit, importing a further image while Brush is active and then immediately dragging) and **31/31 existing extended-editor readiness checks** (save, reopen, undo/export, half-drop/brick/straight patterns, mobile viewport layouts, recovery, large design). No failure lines in that run. Touch input is Android-*emulated* via Chrome DevTools Protocol, **not an actual Android phone**.

**Release approval and checkpoint (12 October 2026):** The owner explicitly instructed **“Deploy and tell me how to update the app.”** This authorises **one production website deployment** of the verified image-drag fix. It does **not** request a new APK/AAB build or publishing the unfinished Poster_gen handoff PR #6. At the time of this checkpoint, production still serves `6acc7c9c9f99880008db10d4`, source SHA `cd69f4174550b476bae5988925e5c06ee77d27dd`. Promote only this source branch by safe fast-forward of `main`, verify new Netlify production deploy and live image-drag checks; record evidence in the development handover without a redundant second production deploy. The standard Android `preview` uses production-hosted HTML and should reload the web changes on restart; `preview-ux2` points to the **unchanged staging** site and will not automatically receive them. Never advise clearing app data before backing up projects.


## 12 October 2026 — Strong stabiliser and automatic freehand closure (development only)

**Approved for one controlled PRODUCTION WEBSITE deployment on 12 October 2026, NOT an Android APK/AAB release.** Source branch `feature/strong-stabilisation-auto-close-20261012` is tested; production publishing and live verification are separate stages. User originally placed deployment on hold, then explicitly authorised **Deploy** on 12 October. Poster_gen draft PR #6 remains separate and excluded.

**Where to find controls after a future approved release:** Brush → Stabilise (**Strong** by default on new projects); Brush → **Auto-join ends** and **Join px** (default on, 24 CSS screen pixels, adjustable 10–40); Freehand Fill → the same Auto-join controls. Smart snapping defaults on for new projects. Open or imported saved projects retain their saved stabilisation, snap and auto-close settings; older archives lacking the new fields receive the new defaults.

**Behaviour:** A completed brush/freehand-fill outline returns to its first point only if it has sufficient travelled length and returns close enough to its start. Open marks, tiny dabs and stamp brushes are not force-closed. Repeated-pattern seams use continuous unwrapped stroke geometry; joins are saved as editable points, so undo/redo and raster/vector exports use the actual joined path. Doodle uses ordinary non-wrapping closure. No background publication, Etsy or supplier action is involved.

**Changes:** `app/index.html` (defaults/controls/script order), `app/js/stroke-closure.js` (pure seam-aware geometry), `app/js/editor.js` (finish stroke, project defaults, save/restore), `app/js/canvas-first-v2.js` (Brush/Fill contextual UI), `tests/auto-close-geometry.test.mjs`, `tests/auto-close-browser.mjs`, `.github/workflows/drawing-assistance-checks.yml` (branch-only CI). Preserve existing project data and the unrelated integration PR.

**Testing — VERIFIED in source (12 October):** latest CI [38209627559](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/38209627559) completed successfully on commit `9d7dd79c`: **5/5 pure geometry tests**, **3/3 full-app Chromium browser scenarios**, and **31/31 existing extended-readiness checks**. Coverage includes Pattern/Doodle closed ovals and deliberately open lines, disabled closure, default Strong and snap, older project compatibility, source save/reopen, autosave recovery, Undo/Redo, PNG/SVG and project export, half-drop/brick/straight tiles, mobile viewport layouts and a 600-mark stress case. Separate earlier targeted CI [38209466803](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/38209466803) also passed. This is simulated pointer input in Chromium; real physical Android finger/stylus behaviour remains **UNVERIFIED**.

**Release checkpoint:** Approval now covers a single production WEBSITE release (not staging or native Android). Tests: 5/5 geometry + 3/3 Chromium + 31/31 existing readiness, [CI 38209627559](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/38209627559). The original Netlify deploy `6ac9067f42301d0008b605d5` is the rollback baseline; production and staging were unchanged on initial read-back. Deploy by moving `main` forward once to this reviewed source and verifying Netlify separately; **do not describe it as live before Netlify read-back and actual live HTTP verification**. The Netlify connected project tools are read-only for deployments, so manual publication may remain necessary if the existing GitHub-to-Netlify release route does not run. Do not merge Poster_gen PR #6, create APK/AAB, or make Etsy/PrintShrimp changes.


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
| Imported image drag and selection | Import image or add another from library → automatically Select; drag image body or Move handle | **New fix on `feature/responsive-image-drag-20261012`; tested 7/7 browser flows + 31/31 regression, NOT deployed** |
| Multi-image batch library | Images → Choose images (5 or more at once) → gallery / Add / full backup | Tested 3/3 batch import and 31/31 existing; **not deployed** |
| Multi-select, group/ungroup, move, scale, rotate, duplicate, delete, flips | Select tool; add artwork to selection; contextual controls | Implemented; transforms, save/reopen and undo covered |
| Recolour selected drawn artwork and replace matching colours | Colour panel | Implemented; editable marks and replacement covered |
| Stroke stabilisation | Brush contextual controls → Stabilise | **Live production website** since the approved 12 Oct Strong-stabilisation release |
| Shape Clean | Top toolbar by Undo / Redo → Shape Clean (or legacy drawing controls); cleans selected/last freehand stroke | **Development branch only**: 6 shape geometry examples + open/scribble guards, 2/2 browser flows including true Doodle PNG alpha and transparent SVG, 31/31 existing regressions passed; NOT deployed |
| Raised oil and icing brushes | Brush → Brush Library → Oil impasto / Piped paint / Palette knife → Size and Relief | Implemented on development branch only; browser geometry + edit/export flows passed, 3/3 geometry, 4/4 full-app flows, 31/31 regression passed; **NOT DEPLOYED** |
| Auto-close near-complete shapes | Brush/Freehand Fill contextual controls → Auto-join ends / Join px | **Live production website** since the approved 12 Oct release; physical phone accuracy still to verify |
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
