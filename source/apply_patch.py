#!/usr/bin/env python3
"""Install or remove the OpenUI source overlay on the pinned Hermes checkout."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DESKTOP = Path("apps/desktop")
TRANSCRIPT = DESKTOP / "src/components/assistant-ui"
RECEIPT = Path(".hermes-openui-install")


def git(repo, *args):
    result = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    if result.returncode:
        raise ValueError(result.stderr.strip() or "Git could not apply the source overlay.")
    return result.stdout.strip()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def payload():
    yield ROOT / "bridge/openui-bridge.tsx", TRANSCRIPT / "openui-bridge.tsx"
    yield ROOT / "bridge/openui-styles.css", TRANSCRIPT / "openui-styles.css"
    lib = ROOT / "vendor/thesys-lib"
    for source in sorted(lib.rglob("*")):
        if source.is_file():
            yield source, TRANSCRIPT / "thesys-lib" / source.relative_to(lib)
    yield ROOT / "vendor/LICENSE-THESYS.txt", TRANSCRIPT / "thesys-lib/LICENSE-THESYS.txt"


def patch(repo, patch_file, *, reverse=False, check=False):
    args = ["apply"]
    if reverse:
        args.append("--reverse")
    if check:
        args.append("--check")
    git(repo, *args, str(patch_file))


def install(repo):
    revision = (ROOT / "source/hermes-revision.txt").read_text().strip()
    if git(repo, "rev-parse", "--show-toplevel") != str(repo) or git(repo, "rev-parse", "HEAD") != revision:
        raise ValueError(f"Expected a dedicated Hermes source checkout at {revision}.")
    patch_file = ROOT / "source/hermes-desktop.patch"
    receipt = repo / RECEIPT
    files = {str(target): digest(source) for source, target in payload()}
    if receipt.exists():
        installed = verify(repo)
        if files != installed or digest(patch_file) != digest(receipt / "overlay.patch"):
            raise ValueError("A different OpenUI overlay is installed. Remove it before upgrading.")
        print("OpenUI is already installed and verified.")
        return
    for target in files:
        dest = repo / target
        if dest.exists() or dest.is_symlink():
            raise ValueError(f"Existing file conflicts with OpenUI: {target}")
    patch(repo, patch_file, check=True)

    copied = []
    applied = False
    receipt.mkdir()
    try:
        shutil.copyfile(patch_file, receipt / "overlay.patch")
        for source, target in payload():
            dest = repo / target
            dest.parent.mkdir(parents=True, exist_ok=True)
            with dest.open("xb") as output:
                copied.append(target)
                output.write(source.read_bytes())
        patch(repo, receipt / "overlay.patch")
        applied = True
        (receipt / "files.json").write_text(json.dumps(files, indent=2) + "\n")
    except BaseException:
        if applied:
            patch(repo, receipt / "overlay.patch", reverse=True)
        remove_payload(repo, copied)
        shutil.rmtree(receipt)
        raise
    print("OpenUI source and locked dependencies applied.")


def verify(repo):
    receipt = repo / RECEIPT
    if not receipt.is_dir():
        raise ValueError("No managed OpenUI overlay found.")
    files = json.loads((receipt / "files.json").read_text())
    for target, expected in files.items():
        dest = repo / target
        if dest.is_symlink() or not dest.is_file() or digest(dest) != expected:
            raise ValueError(f"Installed file is missing or changed: {target}")
    patch(repo, receipt / "overlay.patch", reverse=True, check=True)
    return files


def remove_payload(repo, targets):
    for target in targets:
        dest = repo / target
        dest.unlink()
        parent = dest.parent
        while parent != repo / TRANSCRIPT and not any(parent.iterdir()):
            parent.rmdir()
            parent = parent.parent


def restore(repo):
    files = verify(repo)
    receipt = repo / RECEIPT
    patch(repo, receipt / "overlay.patch", reverse=True)
    remove_payload(repo, files)
    shutil.rmtree(receipt)
    print("Original Hermes source and lockfile restored.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkout", type=Path)
    action = parser.add_mutually_exclusive_group()
    action.add_argument("--restore", action="store_true")
    action.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    repo = args.checkout.expanduser().resolve()
    try:
        if args.verify:
            verify(repo)
            print("OpenUI source overlay verified.")
        elif args.restore:
            restore(repo)
        else:
            install(repo)
    except (OSError, ValueError) as exc:
        parser.exit(1, f"{exc}\n")


if __name__ == "__main__":
    main()
