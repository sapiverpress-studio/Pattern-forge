# Pattern Forge — motif collection ZIP folders and search

## Example
```text
Woodland_creatures/
  Fox/
    sitting.png
    running.png
    Winter/
      sleeping.png
  Hedgehog/
    sitting.png
  Doe/
    sitting.png
```

The ZIP may include the root directory, or it may contain the category directories
directly. If every PNG shares a common parent root, that becomes the default collection
name unless overridden in **My Motifs → Collection name**. If the ZIP has no common
parent root, the ZIP filename supplies the default collection name. The native
**Choose folder** picker preserves paths where the browser provides
`webkitRelativePath`.

**My Motifs → Collection** filters by collection. **Subfolder** filters by
hierarchical category; choosing `Fox` also shows `Fox / Winter`. **Search
every collection** matches partial, case-insensitive, accent-insensitive words
across motif names, filenames, the collection title and all folder names;
entering `fox` shows Fox motifs from every imported collection, temporarily
ignoring the two category filters. Clear search to restore browsing filters.
All paths and search metadata remain on this device in IndexedDB.

The importer keeps the **relative source path** separately from each file's
basename. `Fox/sitting.png` and `Hedgehog/sitting.png` are separate motifs;
importing the same relative path again into the same collection is rejected as
a duplicate. Imported artwork is not placed on the canvas until explicitly
inserted. Existing flat motifs and previously saved editable selections remain
available in the same library.

ZIP limits remain **100 RGBA PNGs**, 200 MB compressed, 300 MB total uncompressed
PNG data and 12 MB per PNG. Files must have real alpha and clean transparent
padding. Files that fail validation are reported, rather than silently accepted.
Do not clear browser or Android app storage to refresh the library. Keep the
original ZIPs and project backups: imported collections are local to the device.

## Release verification

Run `tests/motif-collection-browser.mjs` with Chromium, plus
`tests/multi-image-import-browser.mjs`, `tests/5000px-export-browser.mjs` and
`tests/ux2-extended-readiness.mjs`. These tests cover browser behaviour, not
physical Android performance with 100 large image files.
