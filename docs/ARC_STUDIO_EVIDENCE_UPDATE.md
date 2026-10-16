# MeterBox evidence update for the existing Arc Studio app

Prepared locally on 2026-10-16 for the existing MeterBox project. This file has **not** been uploaded to Arc Studio and does not claim a new deployment or grant outcome.

## Provenance

- Original export: `arc_studio_contract_deployment_guide_ao3lq2.zip`, SHA-256 `8170B40D729FCE364947177F7E7A38F974F9510153CA8BEBA5726924DBB06BC3`.
- Original Solidity business contract `contracts/MeterBox.sol` is preserved byte-for-byte in the ZIP and Git commit `0e0ce5c`; original SHA-256 `B8015EFB3EA95D27B5C244AE544DE7B745629D509B79DC8D7EA435744C8D1D3C`. The current Mainnet candidate contains a later local security change.
- Existing Arc Studio Testnet deployment: [`0xc904569da992f343d0968454abe7486457a1a8f6`](https://explorer.testnet.arc.io/address/0xc904569da992f343d0968454abe7486457a1a8f6). Read-only RPC confirmed its owner is the Arc Studio platform deployer `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`.
- The ZIP contains Studio-authored `contracts/MeterBox.sol`, `src/`, historical `docs/competition-evidence.md` and `docs/validation-report.md`, plus Studio deployment helpers and traces. The owner supplied the exact existing [Studio project URL](https://studio.arc.io/app/205ea75f-eb5f-430e-94d6-cc0889e7ecd9) after export. That URL is not embedded in the ZIP; live Studio account access is still needed to independently inspect the original project history.
- The public Git repository is a later local derivative. Its Foundry deployment script, added replay tests, frontend network safeguards, dependency lockfile and readiness documents were prepared after export. They are not evidence of a Studio Mainnet deployment.
- The later Mainnet candidate modifies `contracts/MeterBox.sol`: EIP-712 domain version `2`, a signed `providerEpoch`, and epoch increment on executed provider rotation. Its tests, generated ABI and frontend v2 ticket flow are external local work. The Studio Testnet deployment continues using original v1. See `ARC_STUDIO_BUILD_PROVENANCE.md` for the exact diff and evidence limits.

## Local development evidence

The bullets below through the initial secret scan are the **pre-security-change checkpoint**. The current candidate's later verification follows them.

- Restored missing `forge-std` source from official v1.17.0 release and installed frontend dependencies from an npm lockfile.
- `forge build` with Solc 0.8.28: PASS.
- `forge test --summary`: 38 unit/fuzz tests PASS; one invariant suite PASS with two invariants, 256 runs and 128,000 calls. Added two replay checks for chain ID and verifying-contract binding.
- Official Arc Foundry v0.8.0-2 in Ubuntu WSL: build PASS; 38 unit/fuzz and 2 invariant tests PASS; Mainnet no-broadcast simulation PASS. The release archive checksum was verified before execution.
- `npm ci` followed by `npm run build`: PASS. Static site preview returned HTTP 200 locally.
- Mainnet frontend build without a verified contract address: correctly REFUSED.
- Standard Forge no-broadcast simulations on Arc Testnet and Mainnet: PASS for constructor values and chain IDs. These simulations sent no transaction and their displayed contract addresses are **not deployed**.
- Arc Mainnet read-only RPC: USDC ERC-20 `decimals()` returned 6; existing Studio testnet contract address has no code on Mainnet.
- Staged public files secret scan: 85 files, zero detected credentials. Original export, `.env`, logs, caches and Studio-only scripts remain outside the public Git set.
- After the local provider-epoch revision: Arc Foundry build PASS; 39 unit/fuzz tests and 2 invariant checks PASS, each invariant with 256 runs and 128,000 calls. A v1/v2 client hash compatibility check and Vite production build PASS. Current Mainnet no-broadcast simulation PASS. See the new provenance and owner deployment documents for exact values. No Mainnet transaction was sent.

## Pending evidence

- Actual USDC fee verification in an approved hardware-wallet transaction preview; the Arc Foundry dry-run still labels Mainnet gas as `ETH`.
- Hardware signer address check and explicit owner approval before any live Mainnet action.
- Mainnet contract address, transaction receipt, verified source and live role reads: none yet.
- Sync this evidence to the **existing** MeterBox Arc Studio app after its owner opens the project; do not create a new app or submit a Microgrants application as part of this preparation.
