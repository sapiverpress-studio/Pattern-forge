# Genuine knitted-wool rendering service (not yet deployed)

This is a real asynchronous backend for TexGen -> Blender Cycles -> Pillow.
It is not a photo repeater, image manipulator or placeholder demo. It needs a
CPU/GPU-capable **dedicated container host** because Netlify Functions cannot
package Blender or safely sustain native 5000px rendering.

## Runtime

Use the root-level Dockerfile `Dockerfile.knit-render`. Configure:
- `KNIT_RENDER_TOKEN` (random 32+ byte hex, keep secret; shared only with Netlify Functions)
- `KNIT_DOWNLOAD_SIGNING_KEY` (different random 32+ byte hex)
- `KNIT_JOBS_PER_HOUR` (default 5, bound cost)
- `KNIT_MAX_ACTIVE` (default 2, single GPU/CPU worker)
- `KNIT_RENDER_TIMEOUT_SECONDS` (default 1200)
- host-provided `PORT`

Netlify site Functions scope must receive:
- `KNIT_RENDER_SERVICE_URL`: actual HTTPS backend origin, **no path**
- `KNIT_RENDER_TOKEN`: same as backend (Functions scope; never the browser)

Public UI at `/knit-renderer/` contacts the same-origin Netlify function
`/api/knit-render`; it submits validated settings, polls the job and receives
a 15-minute HMAC-signed direct PNG download URL. The renderer refuses to start
jobs without strong credentials; direct unauthenticated access is forbidden.

Jobs have a global rate cap, bounded queue and 20-minute Blender timeout.
Local filesystem output is ephemeral and expires after an hour. Before selling
this as a service use persistent object storage, per-user quotas and a proper
hosting/billing plan. Full native 5000x5000 performance and visual quality are
not yet proven; do not expose the UI as a live working service until an actual
remote render and download succeed end-to-end.
