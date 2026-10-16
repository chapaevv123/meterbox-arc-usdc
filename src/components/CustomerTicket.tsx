/**
 * CustomerTicket — the customer half of the two-role settle flow.
 *
 * This component ONLY signs an EIP-712 UsageTicket. It never calls settle()
 * or submits any on-chain transaction. After signing, it displays the full
 * serialised ticket JSON and lets the customer copy it to hand to the provider.
 */
import { useState } from "react";
import { useAccount, useSignTypedData, useSwitchChain } from "wagmi";
import {
  Loader2, Copy, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { toHex } from "viem";
import { METERBOX, TARGET_CHAIN_ID, TARGET_NETWORK_LABEL } from "@/contracts/meterbox";
import { parseAmount } from "@/onchain-money";
import { randomBytes } from "@/utils/random";

// EIP-712 domain + types — must mirror the contract exactly.
const EIP712_DOMAIN = {
  name: "MeterBox",
  version: "1",
  chainId: TARGET_CHAIN_ID,
  verifyingContract: METERBOX.address,
} as const;

const EIP712_TYPES = {
  UsageTicket: [
    { name: "customer",      type: "address" },
    { name: "amount",        type: "uint256" },
    { name: "spendingLimit", type: "uint256" },
    { name: "deadline",      type: "uint256" },
    { name: "nonce",         type: "bytes32" },
  ],
} as const;

/** The serialised ticket handed from customer to provider. */
export interface SignedTicket {
  version:          "MeterBox-v1";
  chainId:          number;
  contract:         string;
  customer:         string;
  amount:           string;   // µUSDC decimal string
  spendingLimit:    string;   // µUSDC decimal string
  deadline:         string;   // unix seconds decimal string
  nonce:            string;   // 0x hex bytes32
  signature:        string;   // 0x hex EIP-712 sig
  /** Human-readable amounts for display only — not verified on-chain. */
  amountDisplay:    string;
  limitDisplay:     string;
  deadlineIso:      string;
}

type SignStep = "idle" | "signing" | "signed" | "error";

export function CustomerTicket() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();

  const [step, setStep]                 = useState<SignStep>("idle");
  const [amount, setAmount]             = useState("");
  const [spendingLimit, setSpendingLimit] = useState("");
  const [errorMsg, setErrorMsg]         = useState("");
  const [ticket, setTicket]             = useState<SignedTicket | null>(null);
  const [copied, setCopied]             = useState(false);
  const [showRaw, setShowRaw]           = useState(false);

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN_ID;
  const isBusy       = step === "signing";

  const handleSign = async () => {
    setErrorMsg("");
    if (!isConnected || !address) return;
    let parsedAmount: ReturnType<typeof parseAmount>;
    let parsedLimit:  ReturnType<typeof parseAmount>;
    try {
      parsedAmount = parseAmount(TARGET_CHAIN_ID, amount);
      parsedLimit  = parseAmount(TARGET_CHAIN_ID, spendingLimit);
    } catch { setErrorMsg("Invalid amount value."); return; }
    if (parsedAmount.raw <= 0n) {
      setErrorMsg("Enter a charge amount greater than zero."); return;
    }
    if (parsedLimit.raw < parsedAmount.raw) {
      setErrorMsg("Spending limit must be at least the charge amount."); return;
    }

    const ticketDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour
    const ticketNonce    = toHex(randomBytes(32));

    setStep("signing");
    try {
      const sig = await signTypedDataAsync({
        domain:      EIP712_DOMAIN,
        types:       EIP712_TYPES,
        primaryType: "UsageTicket",
        message: {
          customer:      address,
          amount:        parsedAmount.raw,
          spendingLimit: parsedLimit.raw,
          deadline:      ticketDeadline,
          nonce:         ticketNonce,
        },
      });

      const signed: SignedTicket = {
        version:       "MeterBox-v1",
        chainId:       TARGET_CHAIN_ID,
        contract:      METERBOX.address,
        customer:      address,
        amount:        parsedAmount.raw.toString(),
        spendingLimit: parsedLimit.raw.toString(),
        deadline:      ticketDeadline.toString(),
        nonce:         ticketNonce,
        signature:     sig,
        amountDisplay:  amount,
        limitDisplay:   spendingLimit,
        deadlineIso:    new Date(Number(ticketDeadline) * 1000).toISOString(),
      };

      setTicket(signed);
      setStep("signed");
    } catch (e: unknown) {
      const err = e as { message?: string; code?: number } | null | undefined;
      const msg = err?.message?.toLowerCase() ?? "";
      if (msg.includes("user rejected") || err?.code === 4001) {
        setStep("idle"); return;
      }
      setErrorMsg(err?.message?.slice(0, 120) ?? "Signing failed.");
      setStep("error");
    }
  };

  const handleCopy = async () => {
    if (!ticket) return;
    // Serialize only the fields the provider needs — no display helpers
    const payload: Omit<SignedTicket, "amountDisplay" | "limitDisplay" | "deadlineIso"> = {
      version:       ticket.version,
      chainId:       ticket.chainId,
      contract:      ticket.contract,
      customer:      ticket.customer,
      amount:        ticket.amount,
      spendingLimit: ticket.spendingLimit,
      deadline:      ticket.deadline,
      nonce:         ticket.nonce,
      signature:     ticket.signature,
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const reset = () => {
    setStep("idle");
    setAmount("");
    setSpendingLimit("");
    setErrorMsg("");
    setTicket(null);
    setCopied(false);
    setShowRaw(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <p className="text-sm text-center py-3" style={{ color: "var(--subtle)" }}>
        Connect your wallet to sign a usage ticket.
      </p>
    );
  }

  if (isWrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
        disabled={isSwitching}
        className="w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-40"
        style={{ background: "var(--accent)", color: "#0d1b2f" }}
      >
        {isSwitching ? "Switching…" : `Switch to ${TARGET_NETWORK_LABEL}`}
      </button>
    );
  }

  return (
    <div className="space-y-4">

      {/* Wallet pill */}
      <div className="rounded-xl px-3 py-2 flex items-center gap-2"
        style={{ background: "rgba(172,198,233,0.07)", border: "1px solid rgba(172,198,233,0.15)" }}>
        <span className="text-xs" style={{ color: "var(--subtle)" }}>Customer:</span>
        <span className="mono text-xs truncate" style={{ color: "var(--ink-2)" }}>{address}</span>
      </div>

      {/* Amount inputs */}
      <div className="grid grid-cols-2 gap-3">
        {([
          { label: "CHARGE AMOUNT (USDC)",  val: amount,        set: setAmount },
          { label: "SPENDING LIMIT (USDC)", val: spendingLimit, set: setSpendingLimit },
        ] as const).map(({ label, val, set }) => (
          <div key={label}>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--subtle)" }}>
              {label}
            </label>
            <div className="glass-inner rounded-xl px-3 py-2.5">
              <input
                inputMode="decimal"
                value={val}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  if (v === "" || /^\d*\.?\d*$/.test(v)) set(v);
                }}
                placeholder="0.00"
                disabled={isBusy || step === "signed"}
                className="display w-full bg-transparent text-xl font-bold tabular-nums outline-none placeholder:text-slate-600 disabled:opacity-50"
                style={{ color: "var(--ink)" }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Signing spinner */}
      {step === "signing" && (
        <div className="glass-inner rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="size-4 animate-spin shrink-0" style={{ color: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            Approve the signature in your wallet…
          </span>
        </div>
      )}

      {/* Signed ticket display */}
      {step === "signed" && ticket && (
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(141,216,159,0.3)" }}>

          {/* Header */}
          <div className="px-4 py-2.5 flex items-center justify-between"
            style={{ background: "rgba(141,216,159,0.08)" }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--success)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--success)" }}>
                TICKET SIGNED — valid 1 hour
              </span>
            </div>
            <button
              onClick={() => { void handleCopy(); }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
              style={{
                background: copied ? "rgba(141,216,159,0.18)" : "rgba(172,198,233,0.12)",
                border: `1px solid ${copied ? "rgba(141,216,159,0.4)" : "rgba(172,198,233,0.25)"}`,
                color: copied ? "var(--success)" : "var(--accent)",
              }}
            >
              {copied
                ? <><CheckCircle2 className="size-3" />Copied</>
                : <><Copy className="size-3" />Copy Ticket</>
              }
            </button>
          </div>

          {/* Summary rows */}
          <div className="px-4 py-3 space-y-1.5"
            style={{ background: "rgba(141,216,159,0.04)" }}>
            {[
              ["Charge",    `${ticket.amountDisplay} USDC`],
              ["Limit",     `${ticket.limitDisplay} USDC`],
              ["Expires",   ticket.deadlineIso],
              ["Customer",  `${ticket.customer.slice(0,10)}…${ticket.customer.slice(-6)}`],
              ["Contract",  `${ticket.contract.slice(0,10)}…${ticket.contract.slice(-6)}`],
              ["Chain ID",  ticket.chainId.toString()],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <span className="text-xs" style={{ color: "var(--subtle)" }}>{k}</span>
                <span className="mono text-xs text-right" style={{ color: "var(--ink-2)" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Raw JSON toggle */}
          <div style={{ borderTop: "1px solid rgba(172,198,233,0.12)" }}>
            <button
              onClick={() => setShowRaw(r => !r)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs"
              style={{ color: "var(--subtle)" }}
            >
              <span>Raw ticket JSON</span>
              {showRaw
                ? <ChevronUp className="size-3.5" />
                : <ChevronDown className="size-3.5" />
              }
            </button>
            {showRaw && (
              <pre
                className="px-4 pb-3 text-xs break-all whitespace-pre-wrap font-mono"
                style={{ color: "var(--muted)" }}
              >
                {JSON.stringify({
                  version:       ticket.version,
                  chainId:       ticket.chainId,
                  contract:      ticket.contract,
                  customer:      ticket.customer,
                  amount:        ticket.amount,
                  spendingLimit: ticket.spendingLimit,
                  deadline:      ticket.deadline,
                  nonce:         ticket.nonce,
                  signature:     ticket.signature,
                }, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Instruction after signing */}
      {step === "signed" && (
        <div className="glass-inner rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
            Copy the ticket above and send it to your provider. The provider connects their wallet
            and pastes the ticket in the <strong style={{ color: "var(--ink-2)" }}>Provider</strong> tab
            to submit the on-chain settlement.
          </p>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <p className="text-xs px-1" style={{ color: "var(--danger)" }}>{errorMsg}</p>
      )}

      {/* Action buttons */}
      {step === "signed" ? (
        <button
          onClick={reset}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all"
          style={{ background: "var(--surface-strong)", color: "var(--ink-2)", border: "1px solid var(--border)" }}
        >
          New Ticket
        </button>
      ) : step === "error" ? (
        <button
          onClick={reset}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold"
          style={{ background: "var(--surface-strong)", color: "var(--ink-2)", border: "1px solid var(--border)" }}
        >
          Reset
        </button>
      ) : (
        <button
          onClick={() => { void handleSign(); }}
          disabled={isBusy}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: "var(--accent)", color: "#0d1b2f" }}
        >
          {isBusy
            ? <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />Signing…
              </span>
            : "Sign Usage Ticket"
          }
        </button>
      )}
    </div>
  );
}
