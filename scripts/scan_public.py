"""Fail closed on common credential leaks in public working-tree candidates.

The scanner prints only file paths and rule names, never matched values.
"""

from __future__ import annotations

import pathlib
import re
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
FORBIDDEN_PARTS = {"node_modules", "dist", "broadcast", "cache", "out", "logs", "secrets", ".deps"}
FORBIDDEN_NAMES = {".env", "console.jsonl", "traces.jsonl"}
TOKEN_RULES = {
    "private-key-block": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "github-token": re.compile(rb"\b(?:ghp_|gho_|ghu_|ghs_|github_pat_)[A-Za-z0-9_]{15,}"),
    "aws-access-key": re.compile(rb"\bAKIA[0-9A-Z]{16}\b"),
    "circle-api-key": re.compile(rb"\b(?:TEST|LIVE)_API_KEY:[A-Za-z0-9_-]{16,}"),
}
ASSIGNMENT = re.compile(
    r"(?im)^\s*(?:export\s+|const\s+|let\s+|var\s+)?"
    r"(?:[A-Z_]*PRIVATE_KEY|[A-Z_]*SECRET|[A-Z_]*API_KEY|[A-Z_]*ACCESS_TOKEN|"
    r"[A-Z_]*MNEMONIC|[A-Z_]*SEED_PHRASE|[A-Z_]*PASSWORD)\s*[:=]\s*"
    r"[\"']?([^\s,\"'}]+)"
)


def main() -> int:
    names = subprocess.check_output(
        ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=ROOT
    ).split(b"\0")
    findings: list[tuple[str, str]] = []
    checked = 0
    for raw in names:
        if not raw:
            continue
        name = raw.decode("utf-8", "replace")
        path = pathlib.PurePosixPath(name)
        if path.name in FORBIDDEN_NAMES or path.suffix.lower() in {".pem", ".key", ".sk", ".log", ".jsonl"} or any(part in FORBIDDEN_PARTS for part in path.parts):
            findings.append((name, "forbidden-path"))
            continue
        data = (ROOT / name).read_bytes()
        checked += 1
        for label, pattern in TOKEN_RULES.items():
            if pattern.search(data):
                findings.append((name, label))
        for match in ASSIGNMENT.finditer(data.decode("utf-8", "replace")):
            value = match.group(1).strip()
            if value.startswith(("<", "${", "process.env", "import.meta.env", "vm.env", "env.", "0x<")):
                continue
            if value.lower() in {"true", "false", "null", "undefined", "none", "placeholder", "example"}:
                continue
            findings.append((name, "credential-assignment"))
            break
    for name, label in sorted(set(findings)):
        print(f"{name}: {label}")
    print(f"public working files scanned: {checked}; findings: {len(set(findings))}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
