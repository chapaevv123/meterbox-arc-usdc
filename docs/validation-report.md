# MeterBox — Testnet Validation Report

> Date: 2026-10-15
> All reads are real Arc Testnet RPC calls via `read_contract`. No values are fabricated.

---

## Step 2: Real Testnet Verification

### PASS — Contract Existence and Deployment
- Contract address: `0xc904569da992f343d0968454abe7486457a1a8f6`
- Deployment tx: `0x5cd283380f11cfd4adf163625175557c359619122aeceb99bf5aa7d36957dba2`
- Deployed: 2026-10-15T23:27:25.834Z (from on-chain metadata)

### PASS — Correct Chain Binding
- `deployedChainId()` → `5042002` (Arc Testnet chain ID confirmed)
- `domainSeparator()` → `0x9a5254cc64e615ef15317aacddf37f7c2d8d712e737319837369a6523c12d352` (live)
- EIP-712 domain is bound to this contract address and chain ID. Any ticket signed for a different chain or address will produce a different digest and fail ECDSA recovery.

### PASS — Correct USDC Wiring
- `usdcToken()` → `0x3600000000000000000000000000000000000000` (Arc Testnet USDC)
- USDC `symbol()` → `USDC`
- USDC `decimals()` → `6`
- Contract holds 0 USDC currently (no deposits from real users yet — platform deployer is not a real end user)

### PASS — Ownership and Roles
- `owner()` → `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42` (Arc Studio platform deployer)
- `provider()` → `0x5B12Ce46C7194aD57d143bC22847224047b1Ef42` (same, for testnet demo)
- `pendingOwner()` → `0x0000…0000` (no ownership transfer in progress — Ownable2Step clean state)

### PASS — Fee Configuration
- `feeRateBps()` → `0` (no protocol fee active)
- `maxFeeRateBps()` → `500` (5% cap, immutable)
- `MAX_FEE_CAP_BPS()` → `1000` (10% hard cap constant)
- `feeRecipient()` → `0x0000…0000` (no fee recipient — any fee would return to customer)

### PASS — Timelock State (Clean)
- `MIN_DELAY()` → `172800` (exactly 2 days in seconds)
- `pendingFeeRate()` → `0` (no pending fee change)
- `pendingFeeRateEta()` → `0` (no pending fee change)
- `pendingFeeRecipient()` → `0x0000…0000` (no pending fee recipient change)
- `MAX_BPS()` → `10000` (basis-points divisor constant)

---

## Verification Result Table

| Operation | Result | Method |
|-----------|--------|--------|
| Wallet connection / chain detection | NOT TESTED — requires interactive wallet | requires your wallet action |
| Deposit with balance change | NOT TESTED — requires testnet USDC and your wallet | requires your wallet action |
| Valid EIP-712 usage authorization (frontend signing) | NOT TESTED | requires your wallet action |
| Settlement and provider accounting | NOT TESTED | requires your wallet action |
| Partial withdrawal | NOT TESTED | requires your wallet action |
| Full withdrawal | NOT TESTED | requires your wallet action |
| Transaction receipts (status/explorer links) | NOT TESTED | requires your wallet action |
| Wrong signer rejection | PASS via Foundry test `test_Revert_SettleInvalidSignature` | forge test |
| Nonce replay rejection | PASS via Foundry test `test_Revert_SettleNonceUsed` | forge test |
| Expired authorization rejection | PASS via Foundry test `test_Revert_SettleExpired` | forge test |
| Wrong chain rejection (ChainMismatch) | PASS via contract code + EIP-712 domain binding | code review + domain separator live read |
| Wrong contract rejection (domain binding) | PASS — domain separator includes `verifyingContract` | code review |
| Withdrawal accounting invariant | PASS — `invariant_BalancesNeverExceedContractHoldings` (256 runs × 128k calls) | forge invariant test |
| Contract deployed and live | PASS — all 16 live reads return correct values | read_contract (Arc Testnet RPC) |
| USDC token correct | PASS — `usdcToken()` returns Arc USDC, `decimals()` = 6 | read_contract |
| EIP-712 domain separator live | PASS — `domainSeparator()` returns non-zero bytes32 | read_contract |
| 2-day timelock MIN_DELAY correct | PASS — `MIN_DELAY()` = 172800 | read_contract |
| Timelock slots clean (no pending changes) | PASS — all eta/addr slots zero | read_contract |
| 38/38 Foundry tests | PASS — re-run confirmed 2026-10-15 | forge test |

---

## Wallet-Required Operations

The following 7 operations require a connected wallet with testnet USDC:

1. **Deposit** — connect wallet on Arc Testnet, approve USDC, call `deposit(amount)`.
2. **Settlement (customer sign)** — sign EIP-712 `UsageTicket` in the Settle tab.
3. **Settlement (provider submit)** — provider wallet calls `settle(params)`.
4. **Partial withdrawal** — call `withdraw(amount)` from customer wallet.
5. **Full withdrawal** — call `withdrawAll()` from customer wallet.
6. **Status / receipts** — verify tx hashes in Tracing panel after each operation.
7. **Wrong-signer rejection** — attempt settle with a different connected wallet.

To perform these: click **Get test USDC** in the Arc Studio sidebar to fund your wallet, then use the app. All transaction hashes appear in the Tracing panel and link to the Arc Testnet explorer.

These operations are NOT automatically testable without a connected user wallet — they require your explicit approval of each transaction. Arc Studio does not simulate or fabricate these results.
