# MeterBox — Arc Microgrants Round 2 — Competition Evidence Package

> Prepared: 2026-10-15
> Status: Testnet complete. Mainnet pending external deployment.

> Historical Arc Studio export document. Publication steps and test counts below describe the Studio project at export time; use the current README and `ARC_STUDIO_EVIDENCE_UPDATE.md` for the locally prepared repository. The exact Studio project URL still requires the owner's confirmation.

---

## 1. Arc Studio Project

The full project is built and running in Arc Studio. The project can be viewed in the Arc Studio preview at any time.

To export:
1. Open the **Code** panel in Arc Studio.
2. Click **Download Code** to get the full project archive (source, tests, artifacts, docs).

---

## 2. Testnet Contract Proof

| Field | Value |
|-------|-------|
| Network | Arc Testnet |
| Contract Address | `0xc904569da992f343d0968454abe7486457a1a8f6` |
| Explorer Link | https://explorer.testnet.arc.io/address/0xc904569da992f343d0968454abe7486457a1a8f6 |
| Deployment Tx | `0x5cd283380f11cfd4adf163625175557c359619122aeceb99bf5aa7d36957dba2` |
| Deployment Tx Explorer | https://explorer.testnet.arc.io/tx/0x5cd283380f11cfd4adf163625175557c359619122aeceb99bf5aa7d36957dba2 |
| Deployed At | 2026-10-15T23:27:25.834Z |
| Chain ID (on-chain) | 5042002 (read live from `deployedChainId()`) |

### Live Read-Contract Results (2026-10-15)

All values read via `read_contract` tool directly from Arc Testnet RPC — not from deployment metadata:

| Function | Expected | Actual | Status |
|----------|----------|--------|--------|
| `owner()` | 0x5B12…Ef42 | 0x5B12Ce46C7194aD57d143bC22847224047b1Ef42 | ✓ PASS |
| `provider()` | 0x5B12…Ef42 | 0x5B12Ce46C7194aD57d143bC22847224047b1Ef42 | ✓ PASS |
| `usdcToken()` | 0x3600…0000 | 0x3600000000000000000000000000000000000000 | ✓ PASS |
| `deployedChainId()` | 5042002 | 5042002 | ✓ PASS |
| `maxFeeRateBps()` | 500 | 500 | ✓ PASS |
| `feeRateBps()` | 0 | 0 | ✓ PASS |
| `feeRecipient()` | 0x0000…0000 | 0x0000000000000000000000000000000000000000 | ✓ PASS |
| `MAX_BPS()` | 10000 | 10000 | ✓ PASS |
| `MAX_FEE_CAP_BPS()` | 1000 | 1000 | ✓ PASS |
| `MIN_DELAY()` | 172800 (2 days) | 172800 | ✓ PASS |
| `pendingOwner()` | 0x0000…0000 | 0x0000000000000000000000000000000000000000 | ✓ PASS |
| `pendingFeeRate()` | 0 | 0 | ✓ PASS |
| `pendingFeeRateEta()` | 0 | 0 | ✓ PASS |
| `domainSeparator()` | — | 0x9a5254cc64e615ef15317aacddf37f7c2d8d712e737319837369a6523c12d352 | ✓ LIVE |
| USDC `symbol()` | USDC | USDC | ✓ PASS |
| USDC `decimals()` | 6 | 6 | ✓ PASS |
| `balances(deployer)` | 0 | 0 | ✓ PASS (no deposits yet) |

---

## 3. Foundry Test Results

38/38 tests pass on fresh re-run (2026-10-15):

```
Ran 36 tests for contracts/test/MeterBox.t.sol:MeterBoxTest
36 passed, 0 failed, 0 skipped

Ran 2 tests for contracts/test/MeterBox.t.sol:MeterBoxInvariantTest
2 passed, 0 failed, 0 skipped (256 runs × 128000 calls each)

Total: 38 passed, 0 failed
```

---

## 4. GitHub Publication Package

To publish to GitHub for independent review:

### Option A: Arc Studio GitHub integration
1. Open the **+** menu in the chat toolbar.
2. Choose **Connect GitHub** (or use the Integrations menu).
3. Create a new repository.
4. Arc Studio pushes the full project.

### Option B: Manual
1. Download the project from **Code → Download Code**.
2. Extract the zip.
3. Run:
   ```bash
   git init
   git add .
   git commit -m "MeterBox v1 — Arc Microgrants Round 2"
   git remote add origin https://github.com/<you>/<repo>
   git push -u origin main
   ```

Recommended `.gitignore` additions (already present in project):
```
.env
contracts/out/
contracts/cache/
node_modules/
dist/
```

Keep in the repo: `bun.lock`, `foundry.toml`, `remappings.txt`, `.foundry-version`, all `.sol` files, all `src/` files, all `docs/`.

---

## 5. Live Frontend Deployment

The frontend connects to the Arc Testnet deployment by default. To share a live demo:

1. Connect Netlify, Vercel, or Hugging Face via the Integrations menu in Arc Studio.
2. Say "deploy this" — Arc Studio handles the build and push.
3. The live URL can be shared as competition evidence.

The Tracing panel in Arc Studio shows all live RPC calls, contract reads, and any transaction traces after wallet interactions.

---

## 6. Mainnet Proof Checklist (Complete After External Mainnet Deploy)

- [ ] Deploy to Arc Mainnet using `docs/mainnet-deployment-plan.md`
- [ ] Record deployed address and deployment tx hash
- [ ] Verify `deployedChainId()` returns `5042`
- [ ] Verify `owner()` returns your hardware wallet / multisig
- [ ] Verify source on Arc Mainnet explorer
- [ ] Update `VITE_USE_MAINNET=true` and `VITE_METERBOX_ADDRESS` in `.env`
- [ ] Rebuild and redeploy frontend to show mainnet contract
- [ ] Record one deposit + settle + withdraw cycle with real USDC tx hashes
- [ ] Submit mainnet contract address and tx hashes to competition organizers

---

## 7. Video Walkthrough Plan

Recommended recording sequence (approx. 5–7 minutes):

1. **Introduction** (30s): What MeterBox is, what problem it solves.
2. **Code walkthrough** (2m): MeterBox.sol — key design decisions: EIP-712, spending limits, per-customer nonce scope, 2-day timelock, Ownable2Step.
3. **Test suite** (1m): `forge test -v` — show 38 tests passing including invariants.
4. **Testnet deployment proof** (30s): Explorer view of the contract address and deployment tx.
5. **Frontend demo** (2m): Connect wallet → Deposit tab → Status tab (live reads) → Settle tab (sign a ticket) → Withdraw tab.
6. **Security summary** (30s): StatusPanel security properties list.
7. **Mainnet readiness** (30s): Walk through `docs/mainnet-deployment-plan.md`.

Screen recording tools: OBS Studio (free), Loom, or Windows built-in Game Bar (Win+G).

---

## 8. Organizer Acceptance Note

**Confirmation required from competition organizers:**
Arc Studio deploys to Arc Testnet only. The MeterBox contract is deployed and verified on Arc Testnet (chain ID 5042002) and the full project is export-ready. Arc Mainnet deployment must be performed independently by the submitter using the instructions in `docs/mainnet-deployment-plan.md`.

Before submitting, confirm with Arc Microgrants Round 2 organizers:
- Whether testnet deployment is sufficient for initial submission.
- Whether the external mainnet deploy (with your own wallet) satisfies the "deployed on Arc Mainnet" requirement.
- What format is required for on-chain proof (address, tx hash, explorer link).
