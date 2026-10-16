# MeterBox — usage-based USDC billing on Arc

Existing MeterBox project exported from Arc Studio. It holds prepaid ERC-20 USDC, accepts customer-signed EIP-712 usage tickets, lets the authorized provider settle usage, and lets customers withdraw unused balance. The original Arc Studio testnet deployment is [viewable on Arc Explorer](https://explorer.testnet.arc.io/address/0xc904569da992f343d0968454abe7486457a1a8f6). Arc Mainnet is **not deployed**.

## Local checks

Requirements: Node.js, npm, Foundry `forge`, Solc 0.8.28. On Arc-specific execution use [Arc Foundry](https://docs.arc.io/arc/tutorials/install-arc-foundry); its official prebuilt binaries require Linux/macOS or Windows WSL.

```powershell
npm ci
npm run build
forge build
forge test --summary
```

The frontend defaults to the existing Arc Testnet contract. `npm run dev` serves a local preview. The static `dist/` output can be uploaded to a free static host after review. No backend, API token, or server-side key is required for read-only use.

For a Mainnet frontend build, set `VITE_USE_MAINNET=true` and `VITE_METERBOX_ADDRESS` to a verified **deployed Mainnet MeterBox** address. The build rejects a missing, zero, or known Studio testnet address. The app uses Arc Mainnet chain ID 5042 and `https://rpc.mainnet.arc.io`. USDC ERC-20 amounts have 6 decimals; native gas USDC has 18. [Arc network settings](https://docs.arc.io/arc/references/connect-to-arc), [USDC address and decimals](https://docs.arc.io/arc/references/contract-addresses).

## Deployment preparation

See [SAFE_DEPLOYMENT.md](docs/SAFE_DEPLOYMENT.md). The checked-in Foundry script fixes the owner, provider, USDC token and 500 bps maximum fee. It never reads a private key. A dry-run uses no `--broadcast`; a future real deployment needs a separate owner approval and hardware-wallet confirmation.

## Security and scope

The contract checks provider authorization, customer EIP-712 signatures, chain ID, verifying contract, ticket expiry, per-customer nonce reuse, balance limits and a timelocked fee cap. The current contract accepts only EOA signatures, including hardware-wallet EOAs; ERC-1271 smart-wallet signatures are not supported. Review the remaining Mainnet blockers in the Pulse readiness report before any deployment.

Never commit `.env`, key files, logs, generated broadcast/cache files or Arc Studio credentials. Historical Studio deployment helpers remain only in the original export/local workspace and are excluded from this public repository. No Mainnet deployment or public site has been performed.
