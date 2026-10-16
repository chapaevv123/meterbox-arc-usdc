# MeterBox deployment preparation

This guide records safe preparation. It is **not** authorization to broadcast.

## Fixed constructor values

| Field | Value |
|---|---|
| Owner | `0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42` |
| Provider | `0x765fb7e6a0BdDDc29f57eeCE34AEda0Fb318805d` |
| USDC ERC-20 | `0x3600000000000000000000000000000000000000` |
| Maximum fee | 500 bps |
| Arc Mainnet | chain ID 5042; `https://rpc.mainnet.arc.io` |
| Arc Testnet | chain ID 5042002; `https://rpc.testnet.arc.io` |

Arc native gas is USDC at 18 decimals. The optional ERC-20 USDC interface used by MeterBox is 6 decimals. Confirm `decimals()` and token code on the target chain immediately before deployment. [Official network configuration](https://docs.arc.io/arc/references/connect-to-arc), [official contract addresses](https://docs.arc.io/arc/references/contract-addresses).

## No-broadcast checks in Windows PowerShell

```powershell
forge build
forge test --summary
forge script contracts/script/DeployMeterBox.s.sol:DeployMeterBox `
  --rpc-url https://rpc.mainnet.arc.io `
  --sender 0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42
```

The simulation must show chain ID 5042 and the four constructor values above. **Do not use the displayed simulated contract address as a deployed address.** Arc Foundry v0.8.0-2 in Ubuntu WSL passed the local tests and Mainnet dry-run. Its CLI still displays the estimated native gas amount with an `ETH` label on Mainnet; Arc's gas asset is USDC. Treat the estimate as indicative only and verify the actual USDC fee in the hardware wallet before any approved live action. Windows PowerShell alone cannot run the official Arc Foundry Linux binary.

## Owner gate before any live deployment

Obtain a separate decision for the final contract source hash, 500 bps fee cap, owner/provider roles, signer device and estimated USDC cost. Confirm the hardware signer controls the intended deployer address. The script uses `vm.startBroadcast()` and expects signer selection from the Foundry CLI; no key file or `.env` secret is required. Only after approval would an operator add `--ledger --broadcast` to the final reviewed command and confirm on the hardware device. No such action is part of this preparation.

After deployment, independently read `owner()`, `provider()`, `usdcToken()`, `maxFeeRateBps()`, `deployedChainId()` and the deployed bytecode, record tx hash/explorer link, verify the contract source, and only then configure the frontend's Mainnet contract address. The constructor sets the owner directly; `acceptOwnership()` is not part of this flow.
