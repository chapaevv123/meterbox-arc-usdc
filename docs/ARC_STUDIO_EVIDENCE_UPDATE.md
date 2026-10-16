# MeterBox evidence update for the existing Arc Studio app

Prepared locally on 2026-10-16 for the existing MeterBox project. This file has **not** been uploaded to Arc Studio and does not claim a new deployment or grant outcome.

## Provenance

- Original export: `arc_studio_contract_deployment_guide_ao3lq2.zip`, SHA-256 `8170B40D729FCE364947177F7E7A38F974F9510153CA8BEBA5726924DBB06BC3`.
- Existing Solidity business contract `contracts/MeterBox.sol` remains byte-for-byte unchanged from the export; SHA-256 `B8015EFB3EA95D27B5C244AE544DE7B745629D509B79DC8D7EA435744C8D1D3C`.
- Existing Arc Studio Testnet deployment: [`0xc904569da992f343d0968454abe7486457a1a8f6`](https://explorer.testnet.arc.io/address/0xc904569da992f343d0968454abe7486457a1a8f6). Read-only RPC confirmed its owner is the Arc Studio platform deployer `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`.

## Local development evidence

- Restored missing `forge-std` source from official v1.17.0 release and installed frontend dependencies from an npm lockfile.
- `forge build` with Solc 0.8.28: PASS.
- `forge test --summary`: 38 unit/fuzz tests PASS; one invariant suite PASS with two invariants, 256 runs and 128,000 calls. Added two replay checks for chain ID and verifying-contract binding.
- `npm ci` followed by `npm run build`: PASS. Static site preview returned HTTP 200 locally.
- Mainnet frontend build without a verified contract address: correctly REFUSED.
- Standard Forge no-broadcast simulations on Arc Testnet and Mainnet: PASS for constructor values and chain IDs. These simulations sent no transaction and their displayed contract addresses are **not deployed**.
- Arc Mainnet read-only RPC: USDC ERC-20 `decimals()` returned 6; existing Studio testnet contract address has no code on Mainnet.
- Staged public files secret scan: 85 files, zero detected credentials. Original export, `.env`, logs, caches and Studio-only scripts remain outside the public Git set.

## Pending evidence

- Arc Foundry runtime/fee validation in WSL/Linux/macOS.
- Hardware signer address check and explicit owner approval before any live Mainnet action.
- Mainnet contract address, transaction receipt, verified source and live role reads: none yet.
- Sync this evidence to the **existing** MeterBox Arc Studio app after its owner opens the project; do not create a new app or submit a Microgrants application as part of this preparation.
