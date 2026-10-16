# MeterBox — usage-based USDC billing on Arc

Existing MeterBox project exported from Arc Studio. It holds prepaid ERC-20 USDC, accepts customer-signed EIP-712 usage tickets, lets the authorized provider settle usage, and lets customers withdraw unused balance. The original Arc Studio testnet deployment is [viewable on Arc Explorer](https://explorer.testnet.arc.io/address/0xc904569da992f343d0968454abe7486457a1a8f6). The later, owner-controlled [Arc Mainnet contract](https://explorer.arc.io/address/0xb394b66f340be231269c53aabb773303aface683) was deployed in [transaction 0x828a…6320c](https://explorer.arc.io/tx/0x828a98226f7deb45312007c176f943683379ac9763ffdbe30cdec7fc3746320c).

## Arc Studio provenance

MeterBox originated in [Arc Studio](https://studio.arc.io/). The original export is preserved outside this repository at `Pulse/imports/arc_studio_contract_deployment_guide_ao3lq2.zip` (SHA-256 `8170B40D729FCE364947177F7E7A38F974F9510153CA8BEBA5726924DBB06BC3`). It contains the Studio-authored contract, tests, frontend, deployment notes and historical testnet evidence. The original `contracts/MeterBox.sol` in the ZIP has SHA-256 `B8015EFB3EA95D27B5C244AE544DE7B745629D509B79DC8D7EA435744C8D1D3C` and is preserved in Git commit `0e0ce5c`; the current contract has later local security changes. Local work after export also changed the frontend, test coverage, deploy script, build setup and documentation; see [the provenance and evidence update](docs/ARC_STUDIO_EVIDENCE_UPDATE.md).

Original Studio project: [MeterBox in Arc Studio](https://studio.arc.io/app/205ea75f-eb5f-430e-94d6-cc0889e7ecd9) (URL supplied by the owner). The Studio testnet deployment was made by the Studio platform account; local Foundry simulations and any later external Mainnet deployment must be identified separately. The original ZIP does not include this project URL, so owner access to that same Studio project remains the way to verify its live history.

| Original Studio evidence | Arc Testnet proof |
|---|---|
| Studio project / network | [Original MeterBox project](https://studio.arc.io/app/205ea75f-eb5f-430e-94d6-cc0889e7ecd9); chain ID `5042002` |
| Contract | [0xc904569da992f343d0968454abe7486457a1a8f6](https://explorer.testnet.arc.io/address/0xc904569da992f343d0968454abe7486457a1a8f6) |
| Deployment transaction | [0x5cd283380f11cfd4adf163625175557c359619122aeceb99bf5aa7d36957dba2](https://explorer.testnet.arc.io/tx/0x5cd283380f11cfd4adf163625175557c359619122aeceb99bf5aa7d36957dba2), successful receipt |
| Proven wallet actions | Successful exact approve, 10 test USDC deposit, 2 partial withdrawal and 8 full withdrawal; three `settle` attempts reverted without payment. [Transaction-by-transaction receipts](docs/ARC_STUDIO_BUILD_PROVENANCE.md#original-arc-testnet-transaction-evidence-read-only-rpc-check-2026-10-16) |

The Studio report timestamps deployment at `2026-10-15T23:27:25.834Z`; the on-chain block timestamp is `2026-10-15T23:27:23Z`. The original Testnet `owner()` and `provider()` are both the Studio platform address `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`. EIP-712 ticket signatures are off-chain. The published Solidity includes later security changes; no bytecode identity with the Studio deployment is claimed.

The deployed Mainnet version adds a provider epoch to EIP-712 tickets. Executing a provider rotation increments the epoch and invalidates earlier tickets, including if the old provider is restored later. The original Studio Testnet contract still uses the v1 ticket schema. The frontend uses v1 in local Testnet development and v2 in the production Mainnet build. See [build provenance](docs/ARC_STUDIO_BUILD_PROVENANCE.md) and [owner deployment checklist](docs/MAINNET_OWNER_DEPLOY_CHECKLIST.md).

## Local checks

Requirements: Node.js, npm, Foundry `forge`, Solc 0.8.28. Arc-specific checks use [Arc Foundry](https://docs.arc.io/arc/tutorials/install-arc-foundry); its official prebuilt binaries require Linux/macOS or Windows WSL. The local preparation passed with Arc Foundry v0.8.0-2 in Ubuntu WSL.

```powershell
npm ci
npm run build
forge build
forge test --summary
```

`npm run dev` defaults to the existing Arc Testnet contract. Production builds use the public settings in `.env.production`: Arc Mainnet `5042` and the independently verified deployed address. No backend, API token, or server-side key is required for read-only use.

The existing [Render Static Site](https://meterbox-arc-usdc.onrender.com/) builds from this repository with `npm ci && npm run build` and publishes `dist`. Its live Mainnet configuration must be checked after each deploy; the Git source alone does not prove what Render is serving.

The checked-in `.env.production` sets `VITE_USE_MAINNET=true` and `VITE_METERBOX_ADDRESS=0xb394b66f340be231269c53aabb773303aface683`. The build rejects a missing, zero, or known Studio testnet address in Mainnet mode. The app uses Arc Mainnet chain ID 5042 and `https://rpc.mainnet.arc.io`. USDC ERC-20 amounts have 6 decimals; native gas USDC has 18. [Arc network settings](https://docs.arc.io/arc/references/connect-to-arc), [USDC address and decimals](https://docs.arc.io/arc/references/contract-addresses).

## Deployment preparation

See [SAFE_DEPLOYMENT.md](docs/SAFE_DEPLOYMENT.md). The checked-in Foundry script fixes the owner, provider, USDC token and 500 bps maximum fee. It never reads a private key. The owner signed the Mainnet deployment through Rabby; it was not an Arc Studio deployment. Read-only Arc RPC verification found receipt status 1, matching creation/runtime bytecode, Owner `0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42`, Provider `0x765fb7e6a0BdDDc29f57eeCE34AEda0Fb318805d`, USDC `0x3600000000000000000000000000000000000000`, cap 500 bps and chain 5042. Deployment gas was `1,450,746` at `21.489 gwei`, costing `0.031175080794` native USDC.

## Security and scope

The contract checks provider authorization, customer EIP-712 signatures, chain ID, verifying contract, ticket expiry, per-customer nonce reuse, balance limits and a timelocked fee cap. The deployed Mainnet contract also invalidates tickets when the provider changes. It accepts only EOA signatures, including hardware-wallet EOAs; ERC-1271 smart-wallet signatures are not supported. Review wallet security warnings and complete read-only wallet checks before any real USDC payment.

Never commit private `.env` files, key files, logs, generated broadcast/cache files or Arc Studio credentials. `.env.production` contains only public build settings. Historical Studio deployment helpers remain only in the original export/local workspace and are excluded from this public repository. No real customer deposit, settlement or withdrawal has been verified on Mainnet yet.
