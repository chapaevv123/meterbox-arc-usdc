# MeterBox — Arc Microgrants submission package

**Status:** preparation only. No Mainnet contract, Mainnet transaction, public app URL or submitted application is claimed here. Owner-provided target: “Arc Microgrants Round 2,” deadline November 1, 2026, reward 500 USDC per selected project. An official Round 2 page and its exact form requirements have **not** been verified. The available [official Arc Microgrants page](https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq) describes an earlier October 14, 2026 closing date and requires a working Arc Mainnet deployment, public repo, short description and public builder profile. Treat the Round 2 deadline and eligibility as unconfirmed until the owner supplies its official URL.

## Copy-ready public fields

| Field | Submission text / evidence |
|---|---|
| Project title | **MeterBox — Usage-Based USDC Billing on Arc** |
| One-line description | Prepaid USDC billing for API and agent services with customer-signed usage tickets, provider-only settlement, replay protection and withdrawal of unused funds. |
| Original Arc Studio project | https://studio.arc.io/app/205ea75f-eb5f-430e-94d6-cc0889e7ecd9 (owner-supplied; authenticated history capture pending) |
| Public source | https://github.com/chapaevv123/meterbox-arc-usdc (confirm published `main` before submission) |
| Public builder profile | https://github.com/chapaevv123 (verify profile page before submission) |
| Public app URL | https://meterbox-arc-usdc.onrender.com/ — HTTPS 200 on 2026-10-16; current JS still shows Mainnet pending and the original Testnet address. This is a Testnet preview, **not** a live Mainnet payment demo. |
| Arc Mainnet contract | **PENDING** — fill only from successful deployment receipt and code check |
| Deployment transaction | **PENDING** — no transaction has been broadcast |
| Mainnet demo transactions | **PENDING** — add only confirmed deposit, settle and withdraw receipts |

### Original Arc Studio Testnet evidence (not Mainnet demo proof)

| Field | Evidence |
|---|---|
| Studio URL / network | https://studio.arc.io/app/205ea75f-eb5f-430e-94d6-cc0889e7ecd9; Arc Testnet `5042002` |
| Original contract | [0xc904569da992f343d0968454abe7486457a1a8f6](https://explorer.testnet.arc.io/address/0xc904569da992f343d0968454abe7486457a1a8f6); Studio platform address owns it |
| Deployment transaction | [0x5cd283380f11cfd4adf163625175557c359619122aeceb99bf5aa7d36957dba2](https://explorer.testnet.arc.io/tx/0x5cd283380f11cfd4adf163625175557c359619122aeceb99bf5aa7d36957dba2); receipt `status=1` |
| Proven customer actions | [Exact approve](https://explorer.testnet.arc.io/tx/0xf2b8559a6a085fd03d4088c425eef6637bc67d017d1e758099d20b5146bf5231), [10 test USDC deposit](https://explorer.testnet.arc.io/tx/0xade8aa51fc163c05de429bc72353945d6a20f96b95299b6d5a3ed28ec9940514), [2 partial withdrawal](https://explorer.testnet.arc.io/tx/0x08082de55a7ef46066bddfea58a7f412c29c20ab59e1d2a5cbc6d1968928b6ba), [8 full withdrawal](https://explorer.testnet.arc.io/tx/0x7971cfff3ba5b495f654e845bd4bf5eab79c900bd6f1905c5234b6d570f9d236); all `status=1` by read-only RPC |
| Settlement attempts | Three Testnet transactions were mined with `status=0` and 0 logs; no successful provider settlement or payment is evidenced. [Full classification](ARC_STUDIO_BUILD_PROVENANCE.md#original-arc-testnet-transaction-evidence-read-only-rpc-check-2026-10-16) |

The Studio report gives deployment time `2026-10-15T23:27:25.834Z`; the confirmed block timestamp is `2026-10-15T23:27:23Z`. The original `owner()` and `provider()` both read the Studio platform address `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42`. Ten successful `eth_signTypedData_v4` responses in the original trace are off-chain signatures, not transactions. The three reverted `settle` calls came from a non-Provider wallet; Unauthorized is expected from the original source's first role check, but the receipts alone do not decode a revert reason. Do not portray these calls as completed usage payments. The local v2 security source in Git is later work and is not asserted to match the Testnet runtime bytecode.

### Short description (English)

MeterBox lets a customer prepay USDC on Arc, sign a bounded and expiring EIP-712 usage ticket, and let only the configured service provider settle the authorized usage. The contract tracks each customer's prepaid balance, rejects nonce replay and expired tickets, caps protocol fees, and lets customers withdraw unused USDC. Arc's native USDC gas and ERC-20 USDC interface make the entire billing flow USDC-denominated. The original project was built in Arc Studio; a later local Foundry security revision adds provider-epoch invalidation for tickets when the provider changes. The Mainnet contract and live flow must be verified before this text is submitted as a live demo.

## Technical architecture and honest limits

React/Vite + wagmi/viem/ConnectKit frontend → Arc RPC → non-upgradeable Solidity `MeterBox` → Arc USDC ERC-20 interface `0x3600000000000000000000000000000000000000`. Customer approves an exact deposit amount, deposits, signs a one-hour EIP-712 ticket, and retains withdrawal control over unused balance. The authorized Provider alone submits settlement. Owner controls Provider and fee settings with a two-day timelock. V2 tickets bind chain ID, verifying contract, per-customer nonce and provider epoch. The public Testnet build continues to use the original Studio v1 contract; the Mainnet build requires a separately verified Mainnet contract address.

Known limits: EOA signatures only (no ERC-1271), a single configured Provider at a time, no external professional audit, wallet/hardware signing and real Mainnet transactions pending. The current public Render app is a Testnet preview; HTTPS delivery was checked, but a real-wallet Mainnet flow has not been verified. The original Studio Testnet contract is owned by the Studio deployer, not the proposed Mainnet Owner. Later security changes and any Mainnet Foundry deployment are external to Studio. Do not describe a no-broadcast simulation as a real deployment.

## Security and test evidence

- Original Studio ZIP and project URL: `ARC_STUDIO_BUILD_PROVENANCE.md`.
- Current candidate: Arc Foundry v0.8.0-2 / Solc 0.8.28 build PASS; 39 unit/fuzz tests and 2 invariant checks PASS, 256 runs and 128,000 calls each. Rotation regression rejects old tickets and accepts current-epoch tickets. Frontend production build and browser rendering have been checked; real-wallet flow remains pending.
- No-broadcast Mainnet simulation and owner transaction gate: `MAINNET_OWNER_DEPLOY_CHECKLIST.md`.
- Secret scan of the public working set and all Git blob history is part of the publication gate and must be repeated after final edits. No private key or seed belongs in the submission package.

## Video walkthrough script (English, ~4 minutes)

1. **0:00–0:30 — Origin.** “MeterBox started in this Arc Studio project.” Show the URL, original contract/tests/frontend and clearly label the Studio Testnet deployment.
2. **0:30–1:15 — Problem and architecture.** “Services need bounded, auditable USDC usage billing.” Show the prepaid balance, exact approval and three roles: customer, Provider, Owner.
3. **1:15–2:00 — Security.** Show EIP-712 fields, expiry, chain/contract binding, nonce replay check, provider epoch and two-day role-change timelock. Identify v2 as the later local Mainnet security revision.
4. **2:00–2:45 — Tests.** Show the Foundry summary, rotation regression, accounting and withdrawal invariants. State plainly that this is local test evidence, not an external audit.
5. **2:45–3:45 — Live Mainnet demo, only after approval.** Show verified contract address and real customer approve/deposit, bounded signature, Provider settlement and customer withdrawal with Explorer receipts. If those steps are not complete, do not record or submit this segment as live proof.
6. **3:45–4:00 — Links.** Show public repository, verified HTTPS app, Arc Explorer and builder profile. End with known limitations.

## Submission checklist — do not submit automatically

1. Obtain the **official Round 2 rules and form URL**. Confirm November 1 deadline, 500 USDC reward, Arc Studio-origin requirement, whether an external Foundry Mainnet deploy is eligible, and whether DoraHacks is actually the submission portal. The available earlier Arc page is insufficient for Round 2.
2. Open the original Studio project with owner access; capture original code/tests/frontend and verify its URL. Keep the ZIP unchanged and distinguish Studio from later Git changes.
3. Ensure public GitHub `main` contains the final source, documentation and passing test commit; verify no secrets or unsafe artifacts in history.
4. After separate owner approvals, verify a working Arc Mainnet contract, real transaction receipts and the updated public HTTPS app. Confirm wallet chain `5042`, address, ABI and balances from a separate browser session.
5. Prepare title, short description, architecture, public builder profile, GitHub URL, app URL, Mainnet contract/Explorer URL, real demo receipts, screenshots and video. Leave any unavailable evidence blank or marked pending.
6. In the verified official submission form, match each required field to real evidence, review eligibility and sanctions/verification terms, preview the final entry, then request the owner's explicit approval before pressing Submit. Save the resulting submission URL/receipt only after confirmation.

No application has been created or submitted by this preparation.
