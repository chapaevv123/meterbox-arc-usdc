"""Compare frontend ABI to the current Foundry compiler output."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
frontend = json.loads((ROOT / "src/contracts/MeterBox.abi.json").read_text(encoding="utf-8"))
artifact = json.loads((ROOT / "contracts/out/MeterBox.sol/MeterBox.json").read_text(encoding="utf-8"))["abi"]

def normalize(items):
    return sorted(json.dumps(item, sort_keys=True, separators=(",", ":")) for item in items)

if normalize(frontend) != normalize(artifact):
    raise SystemExit("Frontend ABI differs from Foundry artifact")
print(f"Frontend ABI matches Foundry artifact: {len(frontend)} entries")
