# Render FREE Static Site setup for MeterBox

Render account connection was not available to this workspace during preparation. No Render service or public URL is claimed. Use only **New → Static Site**, never Web Service or database. [Render static-site documentation](https://render.com/docs/static-sites) confirms Git-based automatic deploy and managed HTTPS; [free-resource documentation](https://render.com/docs/free) describes included bandwidth/build minutes and possible overage billing if no spend limit is set.

| Render form field | Exact value before Mainnet deployment |
|---|---|
| Repository | `https://github.com/chapaevv123/meterbox-arc-usdc` |
| Branch | `main` |
| Root Directory | blank (the Git repository root is the Vite project root) |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Service type | **Static Site** |
| Plan / billing | Free only; check workspace spend limit before creating |
| Environment variables | none for the default Arc Testnet preview |
| Auto deploy | `main` after successful build, if free plan and spend limit are confirmed |

The default app displays **Arc Mainnet deployment pending** and identifies its original Arc Testnet contract. It uses test USDC only. No fake financial results are shown; Status reads the real Testnet contract. The `VITE_*` variables are compiled into public JavaScript, so never put a credential, private RPC token, seed or private key there.

After an owner-approved Mainnet deployment and independent code/address check, set only these public build-time variables in Render and redeploy:

```text
VITE_USE_MAINNET=true
VITE_METERBOX_ADDRESS=<verified deployed Arc Mainnet MeterBox address>
```

The build rejects an empty, zero or known Studio Testnet contract address in Mainnet mode. Before enabling it publicly, verify compiled frontend chain ID 5042, Arc Mainnet RPC, v2 ABI/ticket schema, the exact live contract address, HTTPS, wallet connection and wrong-network handling. Open the resulting Render URL in a separate browser session and inspect the actual DOM, console and on-chain read-only Status. Add that verified URL to README and the submission package. Do not invent a URL or enable Mainnet mode before deployment.
