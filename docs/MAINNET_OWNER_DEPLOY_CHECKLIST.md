# Arc Mainnet owner deployment checkpoint — STOP before broadcast

Prepared 2026-10-16. This is a proposed procedure, **not** authorization or a live deployment. Re-read all changing RPC values and verify the final source commit immediately before signing. Never enter a seed or private key into this project, a shell argument, chat, `.env`, Git or Render.

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

Arc RPC reads on 2026-10-16: chain ID `5042`; USDC interface code size `1798` bytes and `decimals()` = `6`; old Studio Testnet contract address has no code on Mainnet. The proposed Owner address had latest and pending nonce `30` and native gas balance `0` at the snapshot. A real deployment therefore requires funding of the **confirmed signer address** and a fresh nonce check. The Owner constructor address may differ from the deployer, but any such deployer must be reviewed separately.

Arc Foundry v0.8.0-2 no-broadcast command (the owner address was used as a **simulation sender**, not a proven signer):

```text
forge script contracts/script/DeployMeterBox.s.sol:DeployMeterBox --rpc-url https://rpc.mainnet.arc.io --sender 0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42
```

Result: PASS for Owner, Provider, USDC, 500 bps and chain ID 5042. Simulated address `0xb394b66F340bE231269C53aabB773303AfAcE683` is **not deployed**. Foundry reported estimated script gas `1,885,969`, gas price `40.000001041 gwei`, and `0.075438761963293729` in 18-decimal native units. Its CLI labels the amount `ETH`; on Arc this gas asset is USDC. A separate live `eth_gasPrice` read was `20.066125 gwei`; gas prices change.

With a *proposed* 25% gas-unit buffer (`2,357,462`) and the dry-run gas price, the arithmetic cost is `0.094298482454117942` native USDC. **Proposed hard owner ceiling: 0.10 USDC for the deployment transaction. This ceiling is not approved, cannot be enforced by this script, and must be rejected if a fresh wallet quote exceeds it.** Any later approve/deposit/settle/withdraw transaction has a separate cost and requires a separate approval. A zero balance cannot fund deployment; fund only after confirming the device address and a fresh quote.

## OWNER APPROVAL CHECKPOINT

| Required field | Current evidence / gate |
|---|---|
| DEPLOYER ADDRESS | **UNVERIFIED.** Proposed `0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42` only if the hardware device shows that address. Never assume constructor Owner controls the signing device. |
| OWNER ADDRESS | `0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42` (constructor, not yet deployed) |
| PROVIDER ADDRESS | `0x765fb7e6a0BdDDc29f57eeCE34AEda0Fb318805d` (constructor, not yet deployed) |
| CHAIN ID | `5042`, read from RPC; confirm on device again |
| USDC CONTRACT | `0x3600000000000000000000000000000000000000`; code and 6 decimals read; recheck |
| ESTIMATED GAS | `1,885,969` script gas at `40.000001041 gwei` from no-broadcast run; fresh quote required |
| MAX TOTAL SPEND | **NOT APPROVED.** Proposed deployment ceiling `0.10` native USDC; fresh device quote must fit. |
| SIMULATION RESULT | PASS, no broadcast; simulated address is not live |
| SECURITY GATE | Provider epoch regression, 39 unit/fuzz and 2 invariant checks PASS. Independent pre-deploy review and real wallet QA PENDING; no professional audit claim. |
| CONTRACT SOURCE COMMIT | `af67f6b` contains the final Mainnet candidate Solidity source; source SHA-256 `818626A95719B77F1BEA0CCD82C1BCEB70707E1D3F556EC695E80334ED0FB2A1`. Recheck against checked-out bytes before approval. |
| EXACT SIGNING PROCEDURE | See below; blocked until device/address/funding and explicit transaction approval. |

## Exact signing procedure, only after a separate owner decision

1. On the owner-controlled Ledger, select the Arc-capable EVM account and independently read the public address on the device. Confirm it is the approved **deployer**; if it differs from the constructor Owner, update the checkpoint and redo the dry-run with that sender.
2. Confirm Arc Mainnet `5042`, pending nonce for that deployer, sufficient native USDC, current gas price, transaction max cost and deploy transaction recipient (contract creation, no external recipient). Compare the init code and four constructor arguments to this document and the final source commit. Stop if the wallet displays an unexplained chain, recipient, calldata, fee asset or cost.
3. Establish the Ledger connection to WSL/Arc Foundry if required. USB pass-through and actual hardware signing have **not** been verified in this session. Run a read-only Ledger address check first; do not expose recovery phrases.
4. Only after a new explicit owner approval for the exact address, nonce and maximum USDC spend, the operator may run the reviewed command with the `--ledger --broadcast` flags. The current script uses `vm.startBroadcast()` but reads no key. **Do not execute this command as part of preparation:**

```text
forge script contracts/script/DeployMeterBox.s.sol:DeployMeterBox --rpc-url https://rpc.mainnet.arc.io --sender <DEVICE_VERIFIED_DEPLOYER_ADDRESS> --ledger --broadcast
```

5. Confirm the contract creation transaction on the physical device. Record its tx hash and actual gas fee. If the device cannot show the required values or the quote exceeds the approved cap, reject it.
6. Independently inspect receipt success, deployed address/code, compiler settings and verified source on Arc Explorer or Sourcify. Read `owner()`, `provider()`, `providerEpoch() == 0`, `usdcToken()`, `maxFeeRateBps()`, `deployedChainId() == 5042`, and `domainSeparator()`. The source and bytecode must match the final reviewed build. Then update the frontend's verified Mainnet address; no testnet address substitution.

## Separate real-USDC demonstration plan — every transaction owner-confirmed

After deployment verification: (1) build the public frontend with `VITE_USE_MAINNET=true` and `VITE_METERBOX_ADDRESS=<verified Mainnet contract>`; (2) inspect its public HTTPS URL from a separate session; (3) connect the customer wallet and confirm Arc 5042, address and actual ERC-20 USDC balance; (4) approve only the small exact deposit amount, then deposit; (5) read the on-chain MeterBox balance and receipt; (6) sign a bounded one-hour EIP-712 v2 ticket displaying contract, chain, amount, spending limit, nonce and provider epoch; (7) connect the authorized Pulse/provider wallet and simulate `settle`; (8) submit `settle` only with owner confirmation; (9) compare receipt, provider USDC delta, customer balance and fee event; (10) withdraw remaining customer balance with a separate confirmation; (11) capture Explorer receipts and final balances. No unlimited approval, automated wallet signing or unapproved USDC transfer.
