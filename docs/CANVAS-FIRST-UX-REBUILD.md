# Sapiver Pattern Forge — Canvas-first UX rebuild

Status: approved direction, prototype phase
Branch: `feature/canvas-first-ux-v2`

## Why this rebuild exists

Pattern Forge has grown into a capable creative engine, but the interface still behaves like a web form wrapped around a canvas. The redesign changes that relationship: the canvas becomes the primary product surface and controls appear contextually around the current creative task.

This is an interaction-architecture redesign, not a rewrite of the repeat, drawing, layer, export or autosave engines.

## Copyright-safe design rule

Pattern Forge may learn from established creative-tool interaction principles — canvas-first work, contextual controls, gestures, visual layers, tool libraries and progressive disclosure — but must not reproduce Procreate screens, proprietary icons, brush assets, wording, distinctive layouts or visual styling. Pattern Forge uses its own Sapiver visual language and task model.

## Product principles

1. **Canvas first** — artwork receives the majority of the screen.
2. **One active task** — show controls for the current tool, not every possible setting.
3. **Progressive disclosure** — advanced controls are one interaction away, not permanently visible.
4. **Visual over administrative** — brush previews, layer thumbnails, colour swatches and repeat previews replace form-heavy controls.
5. **Fast start** — New Pattern asks primarily for repeat type; New Doodle opens directly into drawing.
6. **Pattern-specialist power** — seamless repeats, seam checking and motif placement remain a core differentiator rather than being buried in Settings.
7. **Touch first, mouse/stylus strong** — large hit targets, gestures and landscape creative work, while preserving desktop precision.
8. **One engine** — Pattern and Doodle share drawing/layer/export infrastructure and diverge only where their workflows genuinely differ.
9. **Android-ready** — web interaction architecture must map cleanly into the Expo/WebView shell and future native bridges.
10. **No destructive migration** — the proven alpha.7.x engine remains recoverable until the replacement shell passes regression.

## Target information architecture

### Gallery / project home

Primary actions:
- New Pattern
- New Doodle
- Open Project
- Recent projects with thumbnails

New Pattern flow:
1. Choose Straight / Half-drop / Brick.
2. Create immediately.
3. Name/customer/theme/variation become editable project metadata, not blockers.

New Doodle flow:
1. Open a blank transparent artwork canvas immediately.
2. Landscape is the preferred phone/tablet workspace.

### Canvas editor

Persistent UI:
- top command bar: Gallery, project title, workspace mode, Undo, Redo, Preview, Export
- left tool rail: Select, Brush, Eraser, Fill, Image, Shapes
- right quick dock: Colour, Layers, Pattern (Pattern only)
- bottom contextual inspector: controls for the active tool/selection only

The canvas occupies all remaining space.

### Contextual examples

**Brush**
- current brush preview
- size
- opacity
- smoothing/stabilisation
- open Brush Library

**Selection / transform**
- move
- scale
- rotate
- flip
- duplicate
- snapping
- delete

**Imported image**
- scale
- rotate
- opacity
- duplicate
- arrange/layer
- replace
- remove

**Pattern**
- repeat style summary
- full repeat preview
- repeat visibility
- centre tile edge
- seam check

## Capability depth roadmap

The redesign exposes current functionality first, then expands depth in deliberate layers.

### Phase 0 — prototype shell
- clickable Gallery and editor prototype
- tool rail
- contextual inspector
- Colour / Layers / Pattern palettes
- desktop and phone-landscape layouts
- no production-engine migration yet

**Exit test:** the interface should look and behave like a credible creative product before engine wiring begins.

### Phase 1 — editor shell migration
- move existing canvas into the new shell
- wire Select / Brush / Eraser / Fill / Pan
- wire Undo / Redo
- preserve current rendering and export behaviour exactly

### Phase 2 — visual Layers and Colour
Layers:
- thumbnails
- visibility
- rename
- opacity
- lock
- reorder
- add / duplicate / delete

Colour:
- current colour
- recent colours
- saved palettes
- eyedropper access

### Phase 3 — selection and transform workspace
- clearer selected-object state
- move / scale / rotate
- flip horizontal / vertical
- duplicate / delete
- visual snapping / alignment controls
- lasso / rectangle selection design exploration

### Phase 4 — brush system depth
- visual brush library
- stroke previews
- size and opacity
- smoothing / stabilisation
- spacing
- texture
- taper/dynamics where technically appropriate
- custom/saved brush presets later

### Phase 5 — Pattern specialist workspace
- full-screen repeat preview
- seam check
- repeat visibility
- centre tile guide
- motif spacing and alignment tools
- recolour variations
- pattern diagnostics/export confidence panel

### Phase 6 — gallery and project management
- generated project thumbnails
- recent projects
- rename / duplicate / delete
- explicit continue/new behaviour
- open/import project

### Phase 7 — gesture and mobile refinement
- pinch zoom
- two-finger pan
- optional canvas rotation where safe
- gesture undo/redo exploration
- stylus-friendly targets
- Doodle landscape workflow
- compact phone-landscape inspector

### Phase 8 — Android convergence
- Expo shell follows editor route/state
- Doodle orientation lock
- Android file picker/save/share bridge
- safe-area handling
- production EAS build only after web UX is stable

## Features intentionally not copied from another product

- no copied toolbar geometry
- no copied icon artwork
- no copied brush names/assets
- no copied gesture vocabulary where it is proprietary or distinctive
- no copied terminology or screen composition
- no attempt to reproduce Procreate as a product

Pattern Forge remains a specialist seamless-pattern and reusable-motif studio.

## Regression guardrails

The UX rebuild must not break:
- straight, half-drop and brick repeat maths
- 300 DPI PNG metadata
- SVG export
- editable project JSON
- ZIP export
- Doodle transparency/no-wrap behaviour
- autosave and explicit Continue flow
- layers and locking
- selection and transform metadata
- snapping
- guides
- eyedropper return behaviour
- real layer-local eraser
- imported image removal
- Start again + Undo restoration

## Prototype success criteria

Before Phase 1 begins, review screenshots and clickable behaviour against these questions:

1. Is the canvas unquestionably the main surface?
2. Can a first-time user identify how to draw within five seconds?
3. Are advanced features visible enough to be discoverable without cluttering the canvas?
4. Does selecting a tool expose the controls expected for that tool?
5. Can Layers, Colour and Pattern controls be found without using a generic Settings page?
6. Does the interface work naturally in desktop and phone landscape?
7. Does the design look recognisably Sapiver Pattern Forge rather than like a clone of another creative app?

Do not migrate the engine until this review passes.
