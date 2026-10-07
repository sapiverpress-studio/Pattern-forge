#!/usr/bin/env python3
"""Package one committed static build, with a source and file-hash manifest."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile


def package(commit, output):
    root = Path(__file__).resolve().parents[1]
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("Use a full, explicit commit SHA")
    resolved = subprocess.check_output(
        ["git", "rev-parse", "--verify", commit + "^{commit}"], cwd=root, text=True
    ).strip()
    if resolved != commit:
        raise ValueError("Source commit did not resolve exactly")
    output = Path(output).resolve()
    if output.exists():
        raise ValueError("Output must be a new directory; existing files will not be overwritten")
    paths = ["index.html", "_headers", "manifest.webmanifest", "assets", "app", "help"]
    archive = subprocess.check_output(
        ["git", "archive", "--format=tar", commit, "--", *paths], cwd=root
    )
    files = {}
    with tarfile.open(fileobj=io.BytesIO(archive)) as source:
        for entry in source:
            if entry.isdir():
                continue
            if not entry.isfile() or ".." in Path(entry.name).parts or entry.name.startswith("/"):
                raise ValueError("Unexpected archive entry: " + entry.name)
            data = source.extractfile(entry).read()
            if entry.name.endswith(".html"):
                html = data.decode("utf-8")
                html = html.replace("</head>", f'<meta name="pattern-forge-build" content="{commit}">\n</head>')
                html = html.replace('<span data-build-label>Development build</span>',
                                    f'<span data-build-label title="{commit}">Build {commit[:8]}</span>')
                data = html.encode("utf-8")
            files[entry.name] = data
    for required in ["index.html", "app/index.html", "app/js/editor.js", "help/index.html"]:
        if required not in files:
            raise ValueError("Required site file missing: " + required)
    manifest = {
        "commit": commit,
        "target": "sapiver-pattern-forge-ux2-staging",
        "files": {name: hashlib.sha256(data).hexdigest() for name, data in sorted(files.items())},
    }
    output.mkdir(parents=True)
    for name, data in files.items():
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    (output / "build.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Packaged {len(files)} files from {commit} into {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output")
    parser.add_argument("--commit", required=True)
    args = parser.parse_args()
    package(args.commit, args.output)
