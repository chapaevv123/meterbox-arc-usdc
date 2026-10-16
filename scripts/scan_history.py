"""Scan every Git blob version without printing matched values."""

from pathlib import PurePosixPath
import subprocess

from scan_public import ASSIGNMENT, ROOT, TOKEN_RULES


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=ROOT)


def main() -> int:
    findings: set[tuple[str, str]] = set()
    checked = 0
    for row in git("rev-list", "--objects", "--all").decode().splitlines():
        oid, _, name = row.partition(" ")
        if not name or git("cat-file", "-t", oid).strip() != b"blob":
            continue
        checked += 1
        path = PurePosixPath(name)
        if path.name == ".env" or path.suffix.lower() in {".pem", ".key", ".sk", ".seed", ".mnemonic"} or any(part in {"secrets", "broadcast"} for part in path.parts):
            findings.add((name, "forbidden-path"))
            continue
        data = git("cat-file", "blob", oid)
        for label, pattern in TOKEN_RULES.items():
            if pattern.search(data):
                findings.add((name, label))
        for match in ASSIGNMENT.finditer(data.decode("utf-8", "replace")):
            value = match.group(1).strip()
            if value.startswith(("<", "${", "process.env", "import.meta.env", "vm.env", "env.", "0x<")) or value.lower() in {"true", "false", "null", "undefined", "none", "placeholder", "example"}:
                continue
            findings.add((name, "credential-assignment"))
            break
    for name, label in sorted(findings):
        print(f"{name}: {label}")
    print(f"history blobs scanned: {checked}; findings: {len(findings)}")
    return bool(findings)


if __name__ == "__main__":
    raise SystemExit(main())
