# Required project continuity

Before inspecting, planning, editing, testing or deploying this repository, read
[`PROJECT-STATUS.md`](PROJECT-STATUS.md). It is the current handover and release
ledger. Verify its recorded state against GitHub and Netlify before relying on
branch, commit or deployment details. Older handovers are historical evidence.

Update `PROJECT-STATUS.md` after **each completed stage**: implementation, testing,
commit/push, packaging, deployment, live verification, or a newly discovered
blocker. Update it again before ending the chat. Include what changed, exact
evidence, known limitations and the next concrete action. Never mark planned work
as done, CI success as physical Android proof, or committed code as deployed.

Keep its feature-location table current when adding or moving a user-facing
feature. Jim must be able to tell whether a feature exists in source, is visible
on staging, or is published in production.

Use the active branch and scope recorded in the status file. Do not overwrite
unrelated work. No force pushes. Do not merge into main, publish production, or
build/release an APK/AAB without explicit user authorisation for that action.
Staging publication is a separate action from production publication.

Before mobile changes, also read `mobile/AGENTS.md`. Preserve standalone Doodle,
existing editable projects, undo/redo, export consistency and local recovery.
Line-connect functionality remains deferred unless Jim changes that requirement.

Do not add automatic scheduled work or continuous deployment without approval.
Keep the staging deploy manual. The current staging workflow tests an immutable
source commit and deploys only to the separate staging site.

Chat interfaces that have not accessed this repository cannot automatically read
these files. When taking over, explicitly open this file and `PROJECT-STATUS.md`.
