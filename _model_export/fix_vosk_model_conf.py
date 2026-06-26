#!/usr/bin/env python3
"""Remove --feature-type=mfcc lines from Vosk conf/model.conf files."""

from __future__ import annotations

import argparse
import re
import sys
import zipfile
from pathlib import Path

# Lines like: --feature-type=mfcc  or  --feature-type = mfcc  (optional comment)
MFCC_FEATURE_TYPE_RE = re.compile(
    r"^\s*--feature-type\s*=\s*mfcc\b.*$",
    re.IGNORECASE,
)

DEFAULT_ROOTS = [
    Path(r"C:\Users\Lenovo\italky-web\_model_export\tmp"),
    Path(r"C:\Users\Lenovo\italky-web"),
    Path(r"C:\Users\Lenovo\AndroidStudioProjects\ItalkyAI"),
]

OFFLINE_SPEECH_DIRNAME = "offline_speech_models"


def discover_roots(extra_roots: list[Path] | None = None) -> list[Path]:
    roots: list[Path] = []
    seen: set[Path] = set()

    def add(path: Path) -> None:
        resolved = path.resolve()
        if resolved in seen:
            return
        if path.exists():
            seen.add(resolved)
            roots.append(path)

    for root in DEFAULT_ROOTS:
        add(root)

    for base in (Path(r"C:\Users\Lenovo\italky-web"), Path(r"C:\Users\Lenovo\AndroidStudioProjects\ItalkyAI")):
        if not base.exists():
            continue
        try:
            for match in base.rglob(OFFLINE_SPEECH_DIRNAME):
                if match.is_dir():
                    add(match)
        except OSError as exc:
            print(f"WARN: could not scan {base} for {OFFLINE_SPEECH_DIRNAME}: {exc}", file=sys.stderr)

    if extra_roots:
        for root in extra_roots:
            add(root)

    return roots


def find_model_conf_files(roots: list[Path]) -> list[Path]:
    found: list[Path] = []
    seen: set[Path] = set()

    for root in roots:
        try:
            for path in root.rglob("model.conf"):
                if not path.is_file():
                    continue
                resolved = path.resolve()
                if resolved in seen:
                    continue
                seen.add(resolved)
                found.append(path)
        except OSError as exc:
            print(f"WARN: could not walk {root}: {exc}", file=sys.stderr)

    return sorted(found)


def find_vosk_zips(search_dir: Path) -> list[Path]:
    if not search_dir.exists():
        return []
    zips: list[Path] = []
    try:
        for path in search_dir.rglob("*.zip"):
            name = path.name.lower()
            if "vosk" in name or "speech" in name or "offline" in name:
                zips.append(path)
    except OSError as exc:
        print(f"WARN: could not scan zips under {search_dir}: {exc}", file=sys.stderr)
    return sorted(zips)


def sanitize_model_conf_content(content: str) -> tuple[str, bool]:
    lines = content.splitlines(keepends=True)
    new_lines: list[str] = []
    changed = False

    for line in lines:
        if MFCC_FEATURE_TYPE_RE.match(line.rstrip("\r\n")):
            changed = True
            continue
        new_lines.append(line)

    if not changed:
        return content, False

    return "".join(new_lines), True


def fix_model_conf(path: Path, dry_run: bool = False) -> bool:
    try:
        original = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        print(f"ERROR: cannot read {path}: {exc}")
        return False

    updated, changed = sanitize_model_conf_content(original)
    if not changed:
        print(f"OK: {path} (no mfcc line)")
        return False

    if dry_run:
        print(f"WOULD FIX: {path}")
        return True

    try:
        path.write_text(updated, encoding="utf-8", newline="\n")
    except OSError as exc:
        print(f"ERROR: cannot write {path}: {exc}")
        return False

    print(f"FIXED: {path}")
    return True


def fix_model_conf_in_zip(zip_path: Path, member: str, dry_run: bool = False) -> bool:
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            original = zf.read(member).decode("utf-8", errors="replace")
    except (OSError, zipfile.BadZipFile, KeyError) as exc:
        print(f"ERROR: cannot read {member} in {zip_path}: {exc}")
        return False

    updated, changed = sanitize_model_conf_content(original)
    if not changed:
        print(f"OK: {zip_path}!{member} (no mfcc line)")
        return False

    if dry_run:
        print(f"WOULD FIX: {zip_path}!{member}")
        return True

    import tempfile
    import shutil

    tmp_fd, tmp_name = tempfile.mkstemp(suffix=".zip")
    os_close = __import__("os").close
    os_close(tmp_fd)

    tmp_path = Path(tmp_name)
    try:
        with zipfile.ZipFile(zip_path, "r") as zin, zipfile.ZipFile(tmp_path, "w") as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == member:
                    data = updated.encode("utf-8")
                zout.writestr(item, data)
        shutil.move(str(tmp_path), str(zip_path))
    except Exception as exc:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        print(f"ERROR: cannot update {zip_path}!{member}: {exc}")
        return False

    print(f"FIXED: {zip_path}!{member}")
    return True


def scan_zips_for_model_conf(search_dir: Path, dry_run: bool = False) -> tuple[int, int]:
    fixed = 0
    checked = 0

    for zip_path in find_vosk_zips(search_dir):
        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                members = [n for n in zf.namelist() if n.endswith("model.conf") or n.endswith("conf/model.conf")]
        except (OSError, zipfile.BadZipFile) as exc:
            print(f"WARN: skipping zip {zip_path}: {exc}")
            continue

        for member in members:
            checked += 1
            if fix_model_conf_in_zip(zip_path, member, dry_run=dry_run):
                fixed += 1

    return fixed, checked


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "roots",
        nargs="*",
        type=Path,
        help="Additional root directories to scan (defaults include _model_export/tmp and offline_speech_models folders)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Report changes without writing")
    parser.add_argument(
        "--skip-zips",
        action="store_true",
        help="Do not scan Supabase export zips under _model_export",
    )
    args = parser.parse_args()

    roots = discover_roots(args.roots or None)
    if not roots:
        print("No scan roots found.")
        return 1

    print("Scan roots:")
    for root in roots:
        print(f"  - {root}")

    model_conf_files = find_model_conf_files(roots)
    print(f"\nFound {len(model_conf_files)} model.conf file(s) on disk.")

    fixed = 0
    for path in model_conf_files:
        if fix_model_conf(path, dry_run=args.dry_run):
            fixed += 1

    zip_fixed = 0
    zip_checked = 0
    if not args.skip_zips:
        export_dir = Path(r"C:\Users\Lenovo\italky-web\_model_export")
        print(f"\nScanning zips under {export_dir} ...")
        zip_fixed, zip_checked = scan_zips_for_model_conf(export_dir, dry_run=args.dry_run)
        if zip_checked:
            print(f"Checked {zip_checked} model.conf entr(y/ies) in zip archives.")

    total_fixed = fixed + zip_fixed
    print(f"\nSummary: fixed {total_fixed} file(s) ({fixed} on disk, {zip_fixed} in zips).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
