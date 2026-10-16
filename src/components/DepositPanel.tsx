import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import { METERBOX, TARGET_CHAIN_ID, buildExplorerTx } from "@/contracts/meterbox";
import { getUsdc } from "@/onchain-facts";
import { parseAmount, usdcDecimalsFor, Amount } from "@/onchain-money";
import { parseOnchainError } from "@/utils/errors";

const USDC = getUsdc(TARGET_CHAIN_ID)!;
const QUICK_AMOUNTS = ["5", "10", "25", "50"];

export function DepositPanel() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN_ID;

  const { data: walletBalance } = useReadContract({
    address: USDC.address as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address },
  });

  const formattedWallet = walletBalance != null
    ? Amount.fromRaw(walletBalance, usdcDecimalsFor(TARGET_CHAIN_ID)).toFixed(2)
    : null;

  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: deposit, data: depositHash, isPending: isDepositing } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

  const isBusy = isApproving || isApproveConfirming || isDepositing || isDepositConfirming;

  const handleApproveAndDeposit = () => {
    setErrorMsg("");
    if (!amount || parseFloat(amount) <= 0) { setErrorMsg("Enter an amount."); return; }
    let parsed: ReturnType<typeof parseAmount>;
    try { parsed = parseAmount(TARGET_CHAIN_ID, amount); } catch { setErrorMsg("Invalid amount."); return; }
    try {
      approve({
        address: USDC.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [METERBOX.address, parsed.raw],
        chainId: TARGET_CHAIN_ID,
      });
    } catch (e) { setErrorMsg(parseOnchainError(e)); }
  };

  const handleDeposit = () => {
    setErrorMsg("");
    if (!amount || parseFloat(amount) <= 0) return;
    let parsed: ReturnType<typeof parseAmount>;
    try { parsed = parseAmount(TARGET_CHAIN_ID, amount); } catch { return; }
    try {
      deposit({ ...METERBOX, functionName: "deposit", args: [parsed.raw], chainId: TARGET_CHAIN_ID });
    } catch (e) { setErrorMsg(parseOnchainError(e)); }
  };

  const step = isDepositSuccess ? "done"
    : isDepositConfirming ? "confirming-deposit"
    : isDepositing ? "pending-deposit"
    : isApproveSuccess ? "approved"
    : isApproveConfirming ? "confirming-approve"
    : isApproving ? "pending-approve"
    : "idle";

  const depositedLabel = amount && step === "done"
    ? Amount.fromRaw(parseAmount(TARGET_CHAIN_ID, amount).raw, usdcDecimalsFor(TARGET_CHAIN_ID)).toFixed(2)
    : "";

  return (
    <div className="space-y-4">
      <div className="glass-inner rounded-2xl p-4">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.]/g, "");
            if (v === "" || /^\d*\.?\d*$/.test(v)) setAmount(v);
          }}
          placeholder="0.00"
          disabled={isBusy || step === "done"}
          className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-600 disabled:opacity-50"
          style={{ color: "var(--ink)" }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "var(--subtle)" }}>USDC</span>
          <button
            disabled={!formattedWallet}
            onClick={() => formattedWallet && setAmount(formattedWallet)}
            className="text-xs font-semibold disabled:opacity-40 transition-opacity"
            style={{ color: "var(--accent-hover)" }}
          >
            {formattedWallet ? `Wallet: ${formattedWallet} · Max` : "Wallet unavailable"}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(q)}
            disabled={isBusy || step === "done"}
            className="flex-1 rounded-xl py-2 text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
            style={{ background: "var(--surface-strong)", color: "var(--ink-2)", border: "1px solid var(--border)" }}
          >
            ${q}
          </button>
        ))}
      </div>

      {step !== "idle" && step !== "done" && (
        <div className="glass-inner rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="size-4 animate-spin shrink-0" style={{ color: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {step === "pending-approve" ? "Confirm approval in wallet…"
              : step === "confirming-approve" ? "Approving USDC spend…"
              : step === "approved" ? "Approval confirmed — ready to deposit"
              : step === "pending-deposit" ? "Confirm deposit in wallet…"
              : "Confirming deposit…"}
          </span>
        </div>
      )}

      {step === "done" && depositHash && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(141,216,159,0.10)", border: "1px solid rgba(141,216,159,0.25)" }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--success)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>
              {depositedLabel} USDC deposited
            </span>
          </div>
          <a href={buildExplorerTx(depositHash)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
            Tx <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {errorMsg && <p className="text-xs px-1" style={{ color: "var(--danger)" }}>{errorMsg}</p>}

      {!isConnected ? (
        <p className="text-sm text-center py-3" style={{ color: "var(--subtle)" }}>Connect your wallet to deposit.</p>
      ) : isWrongChain ? (
        <button
          onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
          disabled={isSwitching}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#0d1b2f" }}
        >
          {isSwitching ? "Switching…" : "Switch to Arc Testnet"}
        </button>
      ) : step === "approved" ? (
        <button
          onClick={handleDeposit}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: "var(--accent)", color: "#0d1b2f" }}
        >
          Deposit USDC
        </button>
      ) : step === "done" ? (
        <button
          onClick={() => { setAmount(""); setErrorMsg(""); }}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: "var(--surface-strong)", color: "var(--ink-2)", border: "1px solid var(--border)" }}
        >
          New Deposit
        </button>
      ) : (
        <button
          onClick={handleApproveAndDeposit}
          disabled={isBusy || !amount}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--accent)", color: "#0d1b2f" }}
        >
          {isBusy ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Processing…
            </span>
          ) : "Approve & Deposit"}
        </button>
      )}
    </div>
  );
}
