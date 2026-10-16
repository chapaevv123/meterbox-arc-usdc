import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { TokenUSDC } from "@web3icons/react";
import { LayoutGrid, ArrowDownToLine, ArrowUpFromLine, Zap, ShieldCheck, RefreshCw } from "lucide-react";
import { DepositPanel } from "@/components/DepositPanel";
import { WithdrawPanel } from "@/components/WithdrawPanel";
import { SettlePanel } from "@/components/SettlePanel";
import { StatusPanel } from "@/components/StatusPanel";
import { RedeployPanel } from "@/components/RedeployPanel";
import { METERBOX, TARGET_CHAIN_ID } from "@/contracts/meterbox";
import { Amount, usdcDecimalsFor } from "@/onchain-money";
import { requireChain } from "@/onchain-facts";

type Tab = "deposit" | "settle" | "withdraw" | "status" | "redeploy";

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "deposit",  label: "Deposit",   Icon: ArrowDownToLine },
  { id: "settle",   label: "Settle",    Icon: Zap },
  { id: "withdraw", label: "Withdraw",  Icon: ArrowUpFromLine },
  { id: "status",   label: "Status",    Icon: ShieldCheck },
  { id: "redeploy", label: "Redeploy",  Icon: RefreshCw },
];

const CHAIN = requireChain(TARGET_CHAIN_ID);

export default function App() {
  const [tab, setTab] = useState<Tab>("deposit");
  const { address, isConnected } = useAccount();

  // Live MeterBox USDC balance for connected wallet
  const { data: rawBalance, isLoading: balanceLoading } = useReadContract({
    ...METERBOX,
    functionName: "balances",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 8000 },
  });

  const decimals = usdcDecimalsFor(TARGET_CHAIN_ID);
  const meterBalance = rawBalance != null ? (rawBalance as bigint) : null;
  const formattedBalance = meterBalance != null
    ? Amount.fromRaw(meterBalance, decimals).toFixed(2)
    : null;

  return (
    <div className="min-h-dvh" style={{ background: "var(--bg-gradient)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: "rgba(13,27,47,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl" style={{ background: "var(--surface-strong)", border: "1px solid var(--border)" }}>
              <TokenUSDC variant="branded" size={20} />
            </div>
            <div>
              <span className="display text-base font-bold" style={{ color: "var(--ink)" }}>MeterBox</span>
              <span className="hidden sm:inline text-xs ml-2" style={{ color: "var(--subtle)" }}>Usage-Based USDC Billing</span>
            </div>
          </div>
          <ConnectKitButton />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {CHAIN.isTestnet && (
          <p className="rounded-xl px-3 py-2 text-center text-xs" style={{ color: "var(--ink-2)", background: "var(--surface-strong)", border: "1px solid var(--border)" }}>
            Arc Mainnet deployment pending. This preview uses Arc Testnet and test USDC only.
          </p>
        )}
        {/* Hero balance card */}
        <div className="glass-card rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="flex size-5 items-center justify-center rounded-md" style={{ background: "rgba(172,198,233,0.15)" }}>
                <LayoutGrid className="size-3" style={{ color: "var(--accent)" }} />
              </div>
              <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--subtle)" }}>
                MeterBox Balance
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: "rgba(141,216,159,0.12)", border: "1px solid rgba(141,216,159,0.2)" }}>
              <div className="size-1.5 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--success)" }}>{CHAIN.name}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="display text-5xl font-bold tabular-nums" style={{ color: "var(--ink)", letterSpacing: "-0.04em" }}>
              {!isConnected ? "—" : balanceLoading ? "…" : formattedBalance ?? "0.00"}
            </span>
            <span className="text-xl font-medium" style={{ color: "var(--subtle)" }}>USDC</span>
          </div>

          <p className="mt-2 text-xs" style={{ color: "var(--subtle)" }}>
            {!isConnected
              ? "Connect wallet to view your prepaid balance"
              : "Prepaid balance available for usage billing"}
          </p>

          {/* Faucet hint */}
          {CHAIN.isTestnet && isConnected && meterBalance === 0n && (
            <div className="mt-3 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(172,198,233,0.08)", border: "1px solid rgba(172,198,233,0.15)", color: "var(--muted)" }}>
              No balance yet. Get test USDC from the <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>official Circle Faucet</a>, then deposit below.
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="glass-card rounded-2xl p-1 flex gap-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all"
              style={{
                background: tab === id ? "var(--surface-strong)" : "transparent",
                color: tab === id ? "var(--ink)" : "var(--subtle)",
                border: tab === id ? "1px solid var(--border-strong)" : "1px solid transparent",
              }}
            >
              <Icon className="size-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="glass-card rounded-3xl p-5">
          {tab === "deposit"  && <DepositPanel />}
          {tab === "settle"   && <SettlePanel />}
          {tab === "withdraw" && <WithdrawPanel meterBalance={meterBalance} />}
          {tab === "status"   && <StatusPanel />}
          {tab === "redeploy" && <RedeployPanel />}
        </div>

        {/* Footer info */}
        <div className="text-center space-y-1 pb-4">
          <p className="text-xs" style={{ color: "var(--subtle)" }}>
            Contract:{" "}
            <a
              href={`${CHAIN.explorerBase}/address/${METERBOX.address}`}
              target="_blank"
              rel="noreferrer"
              className="mono hover:underline"
              style={{ color: "var(--accent)" }}
            >
              {METERBOX.address.slice(0, 10)}…{METERBOX.address.slice(-6)}
            </a>
          </p>
          <p className="text-xs" style={{ color: "var(--subtle)" }}>
            {CHAIN.isTestnet ? "Arc Testnet · test USDC only" : "Arc Mainnet · real USDC"}
          </p>
        </div>
      </main>
    </div>
  );
}
