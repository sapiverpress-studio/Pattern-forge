# UX2 extended test report — 4 October 2026

## Purpose and scope

This pass follows the request to run the five outstanding test areas: portable exports, persistent favourites, smaller screens and fullscreen, damaged imports and interrupted saves, and larger designs. Work is confined to `feature/canvas-first-ux-v2` and the isolated UX2 staging site. It does not approve a commercial or Android release.

Application fixes are recorded in `e4a5905cd4fc5a3df126b0df02679806ac74b2ba` and `3fb82dc52b9fe9449c30d284bc0b22bc4e0f5ae4`. Test-only commit `18a2e75131ea32fe4abc71c8154ace7092dc2f18` makes the share-cancellation assertion observe transient feedback without racing autosave. See the handover for the final deployment identifiers.

Staging deploy `6ac226566d5c6842cea2c5c8` is ready, published at 10:11:40 UTC. Both changed application assets were downloaded from the staging URL and match the tested files byte for byte. An attempted direct Playwright run against that URL stopped before any case ran with `net::ERR_EMPTY_RESPONSE`; this environment could retrieve the assets through curl but its browser could not navigate to the site. Therefore the functional results below are local/CI results, not a completed live-host browser run.

## Defects found and corrected

| Defect | Correction | Verification |
| --- | --- | --- |
| An aborted IndexedDB write could leave newer work only in the fallback, while reload preferred older IndexedDB data | Handle transaction aborts; compare valid autosave candidates by update time; remove stale fallback after successful primary save | Reproduced the old behaviour: grid setting 20 restored instead of latest 40. Corrected source restores 40 after forced transaction abort and reload |
| Malformed strokes and duplicate image IDs could pass initial import validation | Reject null/non-finite stroke coordinates, unsupported mark types, duplicate asset IDs and non-positive image dimensions before replacement | Damaged imports are rejected and the existing editable project is compared before and after |
| Doodle's canvas overlapped the favourites rail at narrower landscape aspect ratios; brush sliders could be clipped | Reserve side space when sizing the canvas and constrain the context panel using border-box sizing | Layout checks at small phone and tablet dimensions; screenshots inspected at 568 × 320 and 1024 × 768 |
| Selecting every favourite could make quick colours unreachable on a short normal-mode screen | Allow the tool rail to scroll and prevent the Doodle colour group shrinking | Every quick colour is scrolled into view and hit-tested; overflowing rails must have user-scrollable overflow |

The broader audit also contained obsolete expectations for Doodle project navigation, setup visibility and Pattern fullscreen height. These were aligned with the accepted standalone Doodle design and the existing space reserved for tool controls. Drawing, exports and control reachability checks remain in place.

## Test coverage

The new suite passes **30 of 30 cases** in the final local run, comprising four portable roundtrips, fourteen recovery cases, one favourites case, ten layout cases and one load case. It is repeatable through `tests/ux2-extended-readiness.mjs` and the `UX2 extended readiness` GitHub Actions workflow. Results and screenshots are uploaded as CI artifacts with seven-day retention.

| Area | What was exercised | Boundary |
| --- | --- | --- |
| Portable exports | Straight, half-drop, brick and Doodle: save JSON and ZIP, reopen, compare editable artwork/layers/settings/placements, compare PNG bytes and SVG text | Tests generated fixtures, not every historical customer file |
| Export dimensions | Straight/Doodle 4000 × 4000; half-drop 4000 × 8000; brick 8000 × 4000 | Correct dimensions do not establish print-provider acceptance |
| Image retention | Placed artwork remains correct; portable files intentionally deduplicate/exclude unused images; local recovery retains unplaced library images | These are different intended save behaviours |
| Damaged imports | Invalid JSON/format/layer, missing image reference, null point, bad coordinate, duplicate asset ID, broken image, excessive layers and truncated ZIP | Rejection must preserve current work |
| Cancelled actions | Start-again cancellation, empty file selection and simulated Web Share cancellation | Does not exercise the physical Android share sheet or directory picker |
| Interrupted saves | Forced IndexedDB abort; both storage backends failing with quota errors; warning and manual export | Browser fault injection, not operating-system process termination |
| Favourites | Reload, Pattern/Doodle switching and intentionally empty favourites; Tools remains accessible | Local browser storage, not cross-device sync |
| Layout | Both workspaces at 568 × 320, 640 × 360, 844 × 390, 1024 × 768 and 360 × 800; normal/fullscreen; portrait rotation gate and rotation | Desktop Chromium with varied viewports; no physical camera cutout or touch ergonomics measurement |
| Load | 24 layers, 600 marks, 24,000 points, eight unique 2048 × 2048 images, 80 placements; 8000 × 4000 PNG export | One synthetic workload on desktop Chromium |

The existing real-editor suite and all eleven underlying engine smoke scripts were also run after the recovery and layout changes. The broader UX audit passes **28 of 28 functional checks** locally and passed GitHub run `37194398024` at application commit `3fb82dc`.

Final extended GitHub run [37194461497](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/37194461497) passed at test commit `18a2e75`. The corresponding engine run `37194461448` passed, and real-editor run `37194398061` passed at the unchanged application commit `3fb82dc`.

## Visual findings that remain open

The broad scanner produced 28 advisory warnings: 24 observations of buttons below its 32-pixel threshold across the sampled states, plus four quick colours outside the current viewport after leaving fullscreen. The latter are reachable by scrolling the rail; the dedicated layout test explicitly checks scrolling and hit targets. They must not be described as four inaccessible controls.

The small buttons are a real remaining ergonomics concern. Zoom and quick colours can be 20–28 CSS pixels in these compact layouts. Passing a mouse hit-test does not prove comfortable finger operation. A larger-target layout needs further design work and physical-phone checks, particularly with every tool favourited. At 568 × 320, reserving space keeps controls usable but leaves a much smaller canvas. This is a visible trade-off, not a claim of ideal phone UX.

## Load measurements and interpretation

The final local run measured 209 ms to import the large fixture, 1,099 ms for PNG export and 19 ms to select Pan afterwards. The PNG was 13,182,417 bytes. These timings include test-harness overhead and vary by run. The reported JavaScript heap was about 6 MiB, which excludes native canvas and decoded-image memory and **must not be quoted as total application memory**.

This proves that the tested workload completed and remained responsive in this environment. It does not set safe Android image/layer limits, prove freedom from out-of-memory crashes or constitute a long-duration stress test.

## Product and readiness implications

Editable portability, failure recovery and access to drawing controls have stronger evidence than before. This directly supports the core promise: create artwork, keep it editable and export it. Recovery bugs were worth fixing before adding new drawing features.

Doodle remains standalone, favourites remain local and persistent, and mirror is available through its canvas controls. Line-connect remains a later feature. No new Doodle project-creation options were introduced.

The commercial assessment remains in the handover. This test pass supplies no new evidence for price, willingness to pay, customer acquisition, print-provider acceptance or an offline sales claim. The wrapper still loads hosted code and there is no service worker or bundled offline editor. Retain the alpha/testing status until the release gates have evidence.

## Remaining release gates

1. Test the intended APK on a physical Android phone: PNG/SVG/JSON/ZIP save, locate and reopen; cancel sharing and the directory picker.
2. Terminate/reopen the native app with real work, including unplaced images; verify backups and recovery.
3. Check cutouts, system bars, rotation, fullscreen, Android Back and finger-sized controls.
4. Measure peak process memory and export reliability on a lower-memory phone. Desktop JavaScript heap is insufficient.
5. Resolve the offline promise, supported-device limits, versioning and commercial packaging before release.

## Reproduction and continuation

Serve the repository root on port 4173 and run `node tests/ux2-extended-readiness.mjs`. `UX2_AUDIT_BASE_URL` selects another test host, `UX2_AUDIT_OUTPUT` selects the result directory and `UX2_AUDIT_FILTER` selects a case-name substring. Start the server and tests in the same execution context here; otherwise localhost can be isolated.

Run `node tests/ux2-complete-ux-audit.mjs` for the broader workflow audit. Read `results.json`/`report.json` and preserve exit codes; piping or following a test with a successful shell command can hide its failure status. A prior complete extended run found the transient cancellation-status race; the test was corrected rather than treating that run as an all-pass result.

Continue from the remote UX2 branch. Do not reset the older dirty deployment checkout or dispatch an old pinned deploy workflow. The staging publication is for testing only; physical-device and commercial gates remain open.
