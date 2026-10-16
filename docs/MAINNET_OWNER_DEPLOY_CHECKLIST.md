# Arc Mainnet owner deployment checkpoint — STOP before broadcast

Prepared 2026-10-16. This is a proposed procedure, **not** authorization or a live deployment. Re-read all changing RPC values and verify the final source commit immediately before signing. Never enter a seed or private key into this project, a shell argument, chat, `.env`, Git or Render.

## Fresh pre-flight checkpoint — 2026-10-16, approximately 10:55–11:00 UTC

The current public GitHub `main` is `629d0ad35e169dc4366248d622030264e55bccae`; the deployable Solidity and script remain unchanged since source commit `af67f6b`. Local `contracts/MeterBox.sol` SHA-256 is still `818626A95719B77F1BEA0CCD82C1BCEB70707E1D3F556EC695E80334ED0FB2A1`. Frontend ABI matches all 61 entries of the Foundry artifact. The prior 39 unit/fuzz and 2 invariant checks remain applicable; executable files have not changed.

Read-only Arc Mainnet RPC at block `26250873` (`2026-10-16T10:55:36Z`) returned chain `5042`, owner-address latest/pending nonce `30`, owner-address native USDC balance **`1.0`**, and `eth_gasPrice` `20.001 gwei`. The official USDC interface at `0x3600000000000000000000000000000000000000` has 1,798 code bytes and `decimals()` `6`; native gas uses 18 decimals. The previously simulated create address still has zero code bytes. These are **time-sensitive observations**, not proof that the owner controls the signer.

A fresh no-broadcast Arc Foundry run with simulated sender `0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42` and `--gas-estimate-multiplier 125` passed. Its latest dry-run transaction has `from` that address, `to=null` (contract creation), nonce `30`, chain `5042`, value `0`, creation code matching the current Foundry artifact plus exactly 128 bytes of the four expected constructor arguments. The simulated address `0xb394b66F340bE231269C53aabB773303AfAcE683` remains **not deployed**. The run estimated `1,813,432` gas at `40.001520875 gwei`, or `0.072540038003393` native USDC. A proposed 25% arithmetic gas buffer is `2,266,790` gas; at that quoted max-fee rate the maximum arithmetic cost is `0.09067504750424125` native USDC. The CLI `ETH` label is generic; Arc charges native USDC. Gas estimates and fee quotes changed between two runs, so **no exact broadcast fee or gas limit is locked in**. The wallet must show an exact final transaction and the owner must separately approve its actual parameters. A proposed `0.10` native USDC deployment ceiling remains unapproved.

The user-provided public app at https://meterbox-arc-usdc.onrender.com/ returned HTTPS 200; its public JS includes the Mainnet-pending banner and original Testnet address. It is **not** a Mainnet-enabled app. No Mainnet transaction has been broadcast. No Ledger/Trezor USB device, Ledger process, Windows Foundry executable or `usbipd` command was detected in this environment. This does not prove the owner lacks a wallet application; the secure signer and its public deployer address must be identified and verified before presenting a final transaction for approval.

## Fixed contract facts

| Field | Value |
|---|---|
| Constructor `initialOwner` | `0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42` |
| Constructor `provider_` | `0x765fb7e6a0BdDDc29f57eeCE34AEda0Fb318805d` |
| Constructor `usdcToken_` | `0x3600000000000000000000000000000000000000` |
| Constructor `maxFeeRateBps_` | `500` (5% cap; initial fee rate 0) |
| Network | Arc Mainnet, chain ID `5042`, `https://rpc.mainnet.arc.io`, `https://explorer.arc.io` |
| Compiler | Solc `0.8.28`, `evm_version=paris`, optimizer enabled, 200 runs (`foundry.toml`) |
| Ticket schema | EIP-712 `MeterBox` version `2`; domain binds chain ID and verifying contract; ticket binds `providerEpoch` |

[Arc network settings](https://docs.arc.io/arc/references/connect-to-arc) and [USDC contract/decimals](https://docs.arc.io/arc/references/contract-addresses) show native gas USDC at 18 decimals and its ERC-20 interface at 6 decimals. Do not convert a gas quote using ERC-20 decimals.

## Read-only snapshot and dry-run

Earlier Arc RPC reads on 2026-10-16: chain ID `5042`; USDC interface code size `1798` bytes and `decimals()` = `6`; old Studio Testnet contract address has no code on Mainnet. The proposed Owner address then had latest and pending nonce `30` and native gas balance `0`; the fresh checkpoint above supersedes that balance observation. The Owner constructor address may differ from the deployer, but any such deployer must be reviewed separately.

Arc Foundry v0.8.0-2 no-broadcast command (the owner address was used as a **simulation sender**, not a proven signer):

```text
forge script contracts/script/DeployMeterBox.s.sol:DeployMeterBox --rpc-url https://rpc.mainnet.arc.io --sender 0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42
```

Result: PASS for Owner, Provider, USDC, 500 bps and chain ID 5042. Simulated address `0xb394b66F340bE231269C53aabB773303AfAcE683` is **not deployed**. Foundry reported estimated script gas `1,885,969`, gas price `40.000001041 gwei`, and `0.075438761963293729` in 18-decimal native units. Its CLI labels the amount `ETH`; on Arc this gas asset is USDC. A separate live `eth_gasPrice` read was `20.066125 gwei`; gas prices change.

For the earlier quote, a *proposed* 25% gas-unit buffer (`2,357,462`) implied `0.094298482454117942` native USDC. The fresh quote and smaller arithmetic buffer are recorded above. **Proposed hard owner ceiling: 0.10 USDC for the deployment transaction. This ceiling is not approved, cannot be enforced by this script, and must be rejected if a fresh wallet quote exceeds it.** Any later approve/deposit/settle/withdraw transaction has a separate cost and requires a separate approval. Confirm device control and a fresh quote before using the now-funded proposed address.

## OWNER APPROVAL CHECKPOINT

| Required field | Current evidence / gate |
|---|---|
| DEPLOYER ADDRESS | **UNVERIFIED.** Proposed `0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42` only if the chosen secure signer independently shows that address. Never assume constructor Owner controls the signer. |
| OWNER ADDRESS | `0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42` (constructor, not yet deployed) |
| PROVIDER ADDRESS | `0x765fb7e6a0BdDDc29f57eeCE34AEda0Fb318805d` (constructor, not yet deployed) |
| CHAIN ID | `5042`, read from RPC; confirm on device again |
| USDC CONTRACT | `0x3600000000000000000000000000000000000000`; code and 6 decimals read; recheck |
| ESTIMATED GAS | Fresh no-broadcast run: `1,813,432` script gas at `40.001520875 gwei`; proposed arithmetic buffer `2,266,790` gas. Exact final wallet gas limit/fee quote required. |
| MAX TOTAL SPEND | **NOT APPROVED.** Latest buffered arithmetic `0.09067504750424125` native USDC; proposed owner ceiling `0.10` native USDC. The final wallet quote must fit the separately approved ceiling. |
| SIMULATION RESULT | PASS, no broadcast; simulated address is not live |
| SECURITY GATE | Provider epoch regression, 39 unit/fuzz and 2 invariant checks PASS. Independent pre-deploy review and real wallet QA PENDING; no professional audit claim. |
| CONTRACT SOURCE COMMIT | `af67f6b` contains the Mainnet candidate Solidity source; current public `main` is `629d0ad`. Source SHA-256 `818626A95719B77F1BEA0CCD82C1BCEB70707E1D3F556EC695E80334ED0FB2A1`. Recheck before approval. |
| EXACT SIGNING PROCEDURE | See below; blocked until device/address/funding and explicit transaction approval. |

## Exact signing procedure, only after a separate owner decision

1. On the owner-controlled Ledger, select the Arc-capable EVM account and independently read the public address on the device. Confirm it is the approved **deployer**; if it differs from the constructor Owner, update the checkpoint and redo the dry-run with that sender.
2. Confirm Arc Mainnet `5042`, pending nonce for that deployer, sufficient native USDC, current gas price, transaction max cost and deploy transaction recipient (contract creation, no external recipient). Compare the init code and four constructor arguments to this document and the final source commit. Stop if the wallet displays an unexplained chain, recipient, calldata, fee asset or cost.
3. Establish the owner-selected signer connection. If the signer is a Ledger used by Arc Foundry in WSL, the Windows USB pass-through helper is currently absent here. Follow [Microsoft's WSL USB guide](https://learn.microsoft.com/en-us/windows/wsl/connect-usb): on Windows check `usbipd list`, bind only the Ledger's bus ID from Administrator PowerShell, attach that bus ID to WSL, then confirm the device in WSL. Install/configure this only with the owner's awareness. Run a read-only signer address check before any broadcast. USB pass-through and actual hardware signing have **not** been verified; do not expose recovery phrases. If the owner uses a wallet application instead, prepare an unsigned create transaction and verify its chain, nonce, init code, constructor arguments, gas limit and max fee in that application before requesting approval; do not import a private key into this project.
4. Only after a new explicit owner approval for the exact address, nonce and maximum USDC spend, the operator may run the reviewed command with the `--ledger --broadcast` flags. The current script uses `vm.startBroadcast()` but reads no key. **Do not execute this command as part of preparation:**

```text
forge script contracts/script/DeployMeterBox.s.sol:DeployMeterBox --rpc-url https://rpc.mainnet.arc.io --sender <DEVICE_VERIFIED_DEPLOYER_ADDRESS> --gas-estimate-multiplier 125 --ledger --broadcast
```

5. Confirm the contract creation transaction on the physical device. Record its tx hash and actual gas fee. If the device cannot show the required values or the quote exceeds the approved cap, reject it.
6. Independently inspect receipt success, deployed address/code, compiler settings and verified source on Arc Explorer or Sourcify. Read `owner()`, `provider()`, `providerEpoch() == 0`, `usdcToken()`, `maxFeeRateBps()`, `deployedChainId() == 5042`, and `domainSeparator()`. The source and bytecode must match the final reviewed build. Then update the frontend's verified Mainnet address; no testnet address substitution.

## Separate real-USDC demonstration plan — every transaction owner-confirmed

After deployment verification: (1) build the public frontend with `VITE_USE_MAINNET=true` and `VITE_METERBOX_ADDRESS=<verified Mainnet contract>`; (2) inspect its public HTTPS URL from a separate session; (3) connect the customer wallet and confirm Arc 5042, address and actual ERC-20 USDC balance; (4) approve only the small exact deposit amount, then deposit; (5) read the on-chain MeterBox balance and receipt; (6) sign a bounded one-hour EIP-712 v2 ticket displaying contract, chain, amount, spending limit, nonce and provider epoch; (7) connect the authorized Pulse/provider wallet and simulate `settle`; (8) submit `settle` only with owner confirmation; (9) compare receipt, provider USDC delta, customer balance and fee event; (10) withdraw remaining customer balance with a separate confirmation; (11) capture Explorer receipts and final balances. No unlimited approval, automated wallet signing or unapproved USDC transfer.

Proposed *small demonstration amounts*, not approvals: `1.000000` ERC-20 USDC deposit (`1_000_000` raw units), `0.100000` USDC ticket charge and equal spending limit (`100_000` raw units), then `0.900000` USDC remaining withdrawal if the initial fee rate is still zero and no other balance-changing action occurs. The exact verified contract address is not yet known. Arc native gas and ERC-20 interface draw on the same USDC balance but use different decimal conventions; each transaction also spends native gas USDC.

| Action / signer | Network, target and amount | Expected effect / approval gate |
|---|---|---|
| Customer `approve` | Arc `5042`; send to USDC interface `0x3600000000000000000000000000000000000000`; `spender=<verified Mainnet MeterBox>`; allowance exactly `1_000_000` raw units | Allow only one `1.000000` USDC deposit. Fresh gas estimate, gas limit, fee cap and exact spender must be shown and separately approved. |
| Customer `deposit` | Arc `5042`; send to `<verified Mainnet MeterBox>`; `deposit(1_000_000)` | MeterBox customer balance should rise by `1.000000` USDC; verify receipt and ERC-20 transfer. Fresh gas/cost and transaction approval required. |
| Customer EIP-712 ticket | **Off-chain signature**, no gas transaction; Mainnet v2 domain, verified contract, `100_000` raw amount and spending limit, one-hour expiry, fresh nonce and current Provider epoch | Authorizes at most `0.100000` USDC for the current Provider epoch. Review wallet signing prompt; do not confuse signature with settlement. |
| Authorized Provider `settle` | Arc `5042`; send to `<verified Mainnet MeterBox>`; ticket amount `100_000` raw units | At zero fee, customer MeterBox balance should become `0.900000`, Provider receives `0.100000` USDC; verify current Provider, fee rate, fresh simulation, gas/cost and separate approval. |
| Customer `withdrawAll` | Arc `5042`; send to `<verified Mainnet MeterBox>`; expected contract balance `900_000` raw units | Return remaining `0.900000` USDC, leave customer MeterBox balance zero; fresh balance/gas/cost and separate approval required. |

If the deployed address, fee rate, customer balance, gas estimate or quote differs, recompute and reapprove the relevant step. **No payment action is authorized by this table.**
