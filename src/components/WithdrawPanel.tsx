import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { METERBOX, TARGET_CHAIN_ID, buildExplorerTx } from "@/contracts/meterbox";
import { parseAmount, usdcDecimalsFor, Amount } from "@/onchain-money";
import { parseOnchainError } from "@/utils/errors";

export function WithdrawPanel({ meterBalance }: { meterBalance: bigint | null }) {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"partial" | "all">("all");
  const [errorMsg, setErrorMsg] = useState("");

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN_ID;
  const decimals = usdcDecimalsFor(TARGET_CHAIN_ID);
  const formattedBalance = meterBalance != null
    ? Amount.fromRaw(meterBalance, decimals).toFixed(2)
    : null;

  const { writeContract: withdraw, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const isBusy = isPending || isConfirming;

  const handleWithdraw = () => {
    setErrorMsg("");
    if (mode === "all") {
      try {
        withdraw({ ...METERBOX, functionName: "withdrawAll", args: [], chainId: TARGET_CHAIN_ID });
      } catch (e) { setErrorMsg(parseOnchainError(e)); }
    } else {
      if (!amount || parseFloat(amount) <= 0) { setErrorMsg("Enter an amount."); return; }
      let parsed: ReturnType<typeof parseAmount>;
      try { parsed = parseAmount(TARGET_CHAIN_ID, amount); } catch { setErrorMsg("Invalid amount."); return; }
      try {
        withdraw({ ...METERBOX, functionName: "withdraw", args: [parsed.raw], chainId: TARGET_CHAIN_ID });
      } catch (e) { setErrorMsg(parseOnchainError(e)); }
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-inner rounded-2xl p-4">
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--subtle)" }}>YOUR METERBOX BALANCE</p>
        <p className="display text-3xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>
          {formattedBalance ?? "—"}{" "}
          <span className="text-lg font-medium" style={{ color: "var(--subtle)" }}>USDC</span>
        </p>
      </div>

      <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {(["all", "partial"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2.5 text-sm font-semibold transition-colors"
            style={{
              background: mode === m ? "var(--surface-strong)" : "transparent",
              color: mode === m ? "var(--ink)" : "var(--subtle)",
            }}
          >
            {m === "all" ? "Withdraw All" : "Partial"}
          </button>
        ))}
      </div>

      {mode === "partial" && (
        <div className="glass-inner rounded-2xl p-4">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "");
              if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
            }}
            placeholder="0.00"
            disabled={isBusy || isSuccess}
            className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-600 disabled:opacity-50"
            style={{ color: "var(--ink)" }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--subtle)" }}>USDC</span>
            <button
              disabled={!formattedBalance}
              onClick={() => formattedBalance && setAmount(formattedBalance)}
              className="text-xs font-semibold disabled:opacity-40"
              style={{ color: "var(--accent-hover)" }}
            >
              {formattedBalance ? `Balance: ${formattedBalance} · Max` : "No balance"}
            </button>
          </div>
        </div>
      )}

      {isBusy && (
        <div className="glass-inner rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="size-4 animate-spin shrink-0" style={{ color: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {isPending ? "Confirm in wallet…" : "Confirming withdrawal…"}
          </span>
        </div>
      )}

      {isSuccess && hash && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(141,216,159,0.10)", border: "1px solid rgba(141,216,159,0.25)" }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--success)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>Withdrawal confirmed</span>
          </div>
          <a href={buildExplorerTx(hash)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
            Tx <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {errorMsg && <p className="text-xs px-1" style={{ color: "var(--danger)" }}>{errorMsg}</p>}

      {!isConnected ? (
        <p className="text-sm text-center py-3" style={{ color: "var(--subtle)" }}>Connect your wallet to withdraw.</p>
      ) : isWrongChain ? (
        <button onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })} disabled={isSwitching}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#0d1b2f" }}>
          {isSwitching ? "Switching…" : "Switch to Arc Testnet"}
        </button>
      ) : isSuccess ? (
        <button onClick={() => setAmount("")}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold"
          style={{ background: "var(--surface-strong)", color: "var(--ink-2)", border: "1px solid var(--border)" }}>
          Done
        </button>
      ) : (
        <button onClick={handleWithdraw} disabled={isBusy || (mode === "all" && !meterBalance)}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--accent)", color: "#0d1b2f" }}>
          {isBusy
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" />Processing…</span>
            : mode === "all" ? "Withdraw All" : "Withdraw"}
        </button>
      )}
    </div>
  );
}
