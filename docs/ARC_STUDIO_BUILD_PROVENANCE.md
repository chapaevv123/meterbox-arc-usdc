# MeterBox build provenance

## Original Arc Studio project

- Owner-supplied original URL: https://studio.arc.io/app/205ea75f-eb5f-430e-94d6-cc0889e7ecd9
- Original unmodified export, retained locally outside this public Git repository: `Pulse/imports/arc_studio_contract_deployment_guide_ao3lq2.zip`.
- ZIP SHA-256: `8170B40D729FCE364947177F7E7A38F974F9510153CA8BEBA5726924DBB06BC3` (145 entries). Original `contracts/MeterBox.sol` SHA-256: `B8015EFB3EA95D27B5C244AE544DE7B745629D509B79DC8D7EA435744C8D1D3C`.
- Studio-authored contract, tests, frontend, build files, deployment guides, `docs/competition-evidence.md`, `docs/validation-report.md`, console and trace history are in that ZIP. The public Git initial commit `0e0ce5c` retained the original contract unchanged while excluding private `.env`, traces, generated artifacts and Studio-only deploy helpers.
- Historical Studio Arc Testnet contract: `0xc904569da992f343d0968454abe7486457a1a8f6`, deployment tx `0x5cd283380f11cfd4adf163625175557c359619122aeceb99bf5aa7d36957dba2`. Historical live reads show owner/provider `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42` (Studio deployer). This contract is not owner-controlled Mainnet proof.

### Original Arc Testnet transaction evidence (read-only RPC check, 2026-10-16)

The unmodified ZIP contains `traces.jsonl` with the submitted transaction hashes and EIP-712 signing requests. Independent `eth_chainId`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, block, code and read-contract queries against `https://rpc.testnet.arc.io` confirm chain `5042002`, the receipts and the original contract roles. The original Studio report gives deployment timestamp `2026-10-15T23:27:25.834Z`; the deployment transaction's block timestamp is `2026-10-15T23:27:23Z`. These are different clocks, so both are labeled by source rather than treated as identical.

| Evidence | Explorer / result |
|---|---|
| Original Studio project | https://studio.arc.io/app/205ea75f-eb5f-430e-94d6-cc0889e7ecd9 (owner-supplied URL; authenticated Studio UI history not independently opened) |
| Network | Arc Testnet, chain ID `5042002`; RPC read confirmed |
| Original contract | [0xc904569da992f343d0968454abe7486457a1a8f6](https://explorer.testnet.arc.io/address/0xc904569da992f343d0968454abe7486457a1a8f6); code absent at block `67407326`, present at deployment block `67407327` |
| Deployment transaction | [0x5cd283380f11cfd4adf163625175557c359619122aeceb99bf5aa7d36957dba2](https://explorer.testnet.arc.io/tx/0x5cd283380f11cfd4adf163625175557c359619122aeceb99bf5aa7d36957dba2): mined, receipt `status=1`, block `67407327` |
| Original roles | `owner()` and `provider()` both read `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`; `deployedChainId()` reads `5042002` |

The deployment transaction targets the ERC-4337 EntryPoint `0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789`, so its receipt's top-level `contractAddress` is `null`. The receipt nevertheless contains a log emitted by the MeterBox address, and contract code appears in that block. Do not misread the EntryPoint/bundler transaction sender as the MeterBox Owner, and do not describe this Testnet deployment as owner-controlled Mainnet deployment.

| Original Studio action | Arc Testnet transaction | Receipt and evidence |
|---|---|---|
| USDC approve, exact `10.000000` to MeterBox | [0xf2b8559a6a085fd03d4088c425eef6637bc67d017d1e758099d20b5146bf5231](https://explorer.testnet.arc.io/tx/0xf2b8559a6a085fd03d4088c425eef6637bc67d017d1e758099d20b5146bf5231) | Mined, `status=1`, block `67411239`; calldata spender and amount decoded |
| Deposit `10.000000` test USDC | [0xade8aa51fc163c05de429bc72353945d6a20f96b95299b6d5a3ed28ec9940514](https://explorer.testnet.arc.io/tx/0xade8aa51fc163c05de429bc72353945d6a20f96b95299b6d5a3ed28ec9940514) | Mined, `status=1`, block `67411412`; ERC-20 Transfer and MeterBox Deposited logs carry `10_000_000` raw units |
| `settle` attempt 1 | [0x4b3a95a53b7d4e98da5a3737b8cc9a19b63c2e74963381b623f1c97494839066](https://explorer.testnet.arc.io/tx/0x4b3a95a53b7d4e98da5a3737b8cc9a19b63c2e74963381b623f1c97494839066) | Mined **reverted**, `status=0`, block `67411572`, 0 logs; no payment |
| `settle` attempt 2 | [0xf2fdd8e9da60f352439347eb1e77159e5b9d502e5c22156312a6310996586e80](https://explorer.testnet.arc.io/tx/0xf2fdd8e9da60f352439347eb1e77159e5b9d502e5c22156312a6310996586e80) | Mined **reverted**, `status=0`, block `67411711`, 0 logs; no payment |
| Partial withdrawal `2.000000` test USDC | [0x08082de55a7ef46066bddfea58a7f412c29c20ab59e1d2a5cbc6d1968928b6ba](https://explorer.testnet.arc.io/tx/0x08082de55a7ef46066bddfea58a7f412c29c20ab59e1d2a5cbc6d1968928b6ba) | Mined, `status=1`, block `67411865`; ERC-20 Transfer and MeterBox Withdrawn logs carry `2_000_000` raw units |
| `settle` attempt 3 | [0xd2572a11d6a683480fe3d5113ac3e486e5ff2a1c64b8bca3093322d67f4865df](https://explorer.testnet.arc.io/tx/0xd2572a11d6a683480fe3d5113ac3e486e5ff2a1c64b8bca3093322d67f4865df) | Mined **reverted**, `status=0`, block `67412051`, 0 logs; no payment |
| Full withdrawal of remaining `8.000000` test USDC | [0x7971cfff3ba5b495f654e845bd4bf5eab79c900bd6f1905c5234b6d570f9d236](https://explorer.testnet.arc.io/tx/0x7971cfff3ba5b495f654e845bd4bf5eab79c900bd6f1905c5234b6d570f9d236) | Mined, `status=1`, block `67459638`; ERC-20 Transfer and MeterBox Withdrawn logs carry `8_000_000` raw units; current customer MeterBox balance reads zero |

The three `settle` calls came from customer `0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42`, while the original contract's Provider is the Studio platform address above. The original Studio source checks Provider authorization first; **Unauthorized is the expected explanation**, but a receipt only proves a revert, not its internal error selector. These are failed authorization tests, not successful provider settlement or USDC payments. `traces.jsonl` also contains 12 `eth_signTypedData_v4` requests (10 signature responses and 2 errors). EIP-712 signatures are **off-chain evidence**, have no transaction hashes or receipts, and none of the reverted settlements proves a successful payment. Some ZIP reports written before these wallet interactions still say deposits/withdrawals were untested; the later trace plus independently checked receipts supersede that specific historical status.

Explorer page rendering itself was not available through the web inspection tool; links follow the existing Arc Testnet Explorer route and the underlying hashes were verified by RPC. No bytecode identity is claimed between this original Studio Testnet deployment and the later local v2 source in `af67f6b`.

The exact Studio URL was supplied after export and is absent from the ZIP. Direct authenticated inspection of its current project history has **not** been completed in this workspace. The owner should open the same project to capture that evidence. No new Studio project was created. An external Foundry deployment is not a Studio deployment.

## Later local work and exact security diff

Commits `0e0ce5c`, `51b929d`, and `002ddcc` record cleaned export preparation, Arc Foundry validation, frontend QA and provenance notes. Later local Mainnet security work changes the current `contracts/MeterBox.sol` relative to `002ddcc` in exactly these ways:

The security source commit is `af67f6b`. Current `contracts/MeterBox.sol` SHA-256 is `818626A95719B77F1BEA0CCD82C1BCEB70707E1D3F556EC695E80334ED0FB2A1`.

1. EIP-712 domain version hash changes from `"1"` to `"2"`.
2. `UsageTicket` type hash appends `uint256 providerEpoch` after `bytes32 nonce`.
3. A public `providerEpoch` state variable starts at zero and increments on each successful `executeProvider()`.
4. `_typedDataHash()` includes the current epoch. A pre-rotation ticket cannot authenticate after a provider change, even if the previous address returns. Old nonces remain permanently used once settled.

Constructor values, USDC accounting, withdrawal paths, fee logic, role checks, EIP-712 chain/contract binding and the two-day timelock are unchanged. The original Studio Solidity bytes remain recoverable from the ZIP and the first Git commit. The updated contract is a **local external Mainnet candidate**, not a change to the deployed Studio Testnet contract.

The frontend preserves v1 signing/verification on the original Testnet address. It uses v2 and reads `providerEpoch` only when explicitly built for Mainnet with a separately verified Mainnet contract address. The regenerated ABI is from the current Foundry artifact. Mainnet remains undeployed; no bytecode or transaction hash is claimed as live.

## Verification and limits

- Arc Foundry v0.8.0-2, Solc 0.8.28, EVM Paris, optimizer 200 runs: build passed. Updated suite: 39 unit/fuzz tests and 2 invariants passed (256 runs, 128,000 calls). Rotation regression rejects an old ticket, accepts a new-epoch ticket and proves the digest does not revive when the old provider returns.
- Local Vite TypeScript and production build passed. The v1 client hash is unchanged by an ignored message property; v2 epoch and version changes produce distinct hashes (`npm run check:ticket`).
- Read-only Mainnet and no-broadcast simulation evidence is in `MAINNET_OWNER_DEPLOY_CHECKLIST.md`. A dry-run address is not a deployed address.
- This is local testing and static review, **not** a professional audit or an independent review. Hardware-wallet signing, actual on-chain deposit/settle/withdraw and public Mainnet URL are pending.

## Capture list for the owner

1. Open the original Studio URL with the URL visible; capture its project title and date/history panel.
2. Capture the original `contracts/MeterBox.sol` in Studio and the Studio test results with test counts visible.
3. Capture the original frontend preview in Studio and its Arc Testnet network indicator.
4. Capture the original Studio Testnet deployment record, contract address, tx hash and explorer page.
5. Capture the ZIP export filename and SHA-256 locally, without opening `.env` or trace contents on camera.
6. Show the Git diff from `002ddcc` for the v2 epoch change, then show the new Arc Foundry test summary and no-broadcast Mainnet simulation. Label these as **later local work**.
7. After a separately approved Mainnet deployment, capture verified Mainnet source, role reads and real transaction receipts as a distinct chapter. Until then, leave this chapter pending.

## Grant eligibility check

The owner describes an “Arc Microgrants Round 2” deadline of November 1, 2026. A current official Arc Microgrants page found during preparation describes an earlier closing date of October 14, 2026 and requires a live Arc Mainnet app and public repo: https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq. The Round 2 page, deadline and whether external Foundry security changes to a Studio-created app satisfy any Studio-specific condition remain **unverified**. Obtain the official Round 2 rules before submission; do not reuse the earlier round's date as Round 2 proof.
