# MeterBox project notes

This repository is the cleaned Arc Studio export of the existing MeterBox project. Its original ZIP remains in the Pulse `imports` directory. Do not recreate MeterBox or alter its deployed Arc Studio testnet contract.

## Network and roles

- Arc Testnet: chain ID `5042002`, RPC `https://rpc.testnet.arc.io`, existing Studio contract `0xc904569da992f343d0968454abe7486457a1a8f6`.
- Arc Mainnet: chain ID `5042`, RPC `https://rpc.mainnet.arc.io`. MeterBox is **not deployed** there.
- USDC ERC-20 interface on both networks: `0x3600000000000000000000000000000000000000`, 6 decimals. Native gas USDC uses 18 decimals.
- Owner: `0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42`.
- Provider: `0x765fb7e6a0BdDDc29f57eeCE34AEda0Fb318805d`.

## Safety

- Never request, print, store, commit, or pass a seed/private key through a command line or `.env`.
- No Mainnet broadcast, real USDC movement, GitHub push, or hackathon submission without the owner's separate approval.
- Arc Studio-only scripts and old export guides are retained locally but excluded from Git. Use `docs/SAFE_DEPLOYMENT.md` for current steps.
- A standard Forge dry-run checks constructor and EVM execution but its gas estimate labels Arc's USDC as ETH; Arc Foundry is needed for Arc-native fee checks.
- `VITE_USE_MAINNET=true` requires an explicitly configured, independently verified Mainnet contract address. Never use the Studio testnet contract on Mainnet.

## Checks

Run `forge build`, `forge test --summary`, and `npm ci` followed by `npm run build`. The deploy script requires no secret for a dry-run: `forge script contracts/script/DeployMeterBox.s.sol:DeployMeterBox --rpc-url https://rpc.mainnet.arc.io --sender 0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42` (no `--broadcast`).
