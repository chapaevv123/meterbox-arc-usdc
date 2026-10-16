/**
 * ProviderSettle — the provider half of the two-role settle flow.
 *
 * Only rendered when the connected wallet is the authorised provider.
 * Accepts a pasted SignedTicket JSON, validates every field client-side,
 * simulates the settlement via eth_call, then submits from the provider wallet.
 * No private keys are ever required, logged, or transmitted.
 */
import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  usePublicClient,
} from "wagmi";
import {
  Loader2, ExternalLink, CheckCircle2, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { recoverTypedDataAddress } from "viem";
import { METERBOX, TARGET_CHAIN_ID, buildExplorerTx, buildExplorerAddress } from "@/contracts/meterbox";
import { EIP712_DOMAIN, EIP712_TYPES, TICKET_IS_V2, TICKET_VERSION, ticketMessage } from "@/contracts/ticket";
import { Amount, usdcDecimalsFor } from "@/onchain-money";
import { parseOnchainError } from "@/utils/errors";
import type { SignedTicket } from "./CustomerTicket";

type ProvideStep = "idle" | "validating" | "valid" | "simulating" | "ready" | "pending" | "confirming" | "done" | "error";

interface Validation {
  chainOk:    boolean;
  contractOk: boolean;
  signerOk:   boolean;
  epochOk:    boolean;
  notExpired: boolean;
  nonceOk:    boolean | null;   // null = still loading
  amountOk:   boolean;
  balanceOk:  boolean | null;   // null = still loading
}

function Row({ label, ok, detail }: { label: string; ok: boolean | null; detail?: string }) {
  const color = ok === null ? "var(--subtle)" : ok ? "var(--success)" : "var(--danger)";
  const icon  = ok === null ? "·" : ok ? "✓" : "✗";
  return (
    <div className="flex items-start justify-between gap-2 text-xs py-0.5">
      <span style={{ color: "var(--subtle)" }}>{label}</span>
      <span className="font-semibold mono text-right" style={{ color }}>
        {icon}{detail ? ` ${detail}` : ""}
      </span>
    </div>
  );
}

export function ProviderSettle() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const decimals     = usdcDecimalsFor(TARGET_CHAIN_ID);

  const [step, setStep]         = useState<ProvideStep>("idle");
  const [raw, setRaw]           = useState("");
  const [ticket, setTicket]     = useState<SignedTicket | null>(null);
  const [validation, setValid]  = useState<Validation | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [settledHash, setHash]  = useState<`0x${string}` | undefined>(undefined);

  // Live nonce-used check
  const { data: nonceUsed } = useReadContract({
    ...METERBOX,
    functionName: "usedNonces",
    args: ticket
      ? [ticket.customer as `0x${string}`, ticket.nonce as `0x${string}`]
      : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!ticket },
  });

  // Live customer balance check
  const { data: customerBal } = useReadContract({
    ...METERBOX,
    functionName: "balances",
    args: ticket ? [ticket.customer as `0x${string}`] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!ticket, refetchInterval: 6000 },
  });

  // Post-settlement balance reads
  const { data: postCustomerBal, refetch: refetchCustomer } = useReadContract({
    ...METERBOX,
    functionName: "balances",
    args: ticket ? [ticket.customer as `0x${string}`] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: false },
  });
  const { data: postProviderBal, refetch: refetchProvider } = useReadContract({
    ...METERBOX,
    functionName: "balances",
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: false },
  });

  const { writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError: isReceiptError, error: receiptError } =
    useWaitForTransactionReceipt({ hash: settledHash });

  // Derive effective step from wagmi receipt state (avoids setState-in-effect)
  const effectiveStep: ProvideStep =
    step === "confirming" && isSuccess        ? "done"
    : step === "confirming" && isReceiptError ? "error"
    : step;
  const effectiveError =
    step === "confirming" && isReceiptError
      ? (parseOnchainError(receiptError) || "Transaction reverted on-chain.")
      : errorMsg;

  // ── Parse and validate pasted ticket JSON ────────────────────────────────
  const handleValidate = async () => {
    setErrorMsg("");
    setValid(null);
    setTicket(null);

    let parsed: SignedTicket;
    try {
      parsed = JSON.parse(raw) as SignedTicket;
    } catch {
      setErrorMsg("Invalid JSON — paste the full ticket exactly as copied."); return;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      setErrorMsg("Ticket must be a JSON object."); return;
    }

    // Basic shape check
    const required: (keyof SignedTicket)[] = [
      "version","chainId","contract","customer","amount","spendingLimit",
      "deadline","nonce","signature",
    ];
    for (const k of required) {
      if (parsed[k] == null) {
        setErrorMsg(`Ticket is missing field: ${k}`); return;
      }
    }
    if (parsed.version !== TICKET_VERSION) {
      setErrorMsg(`Unknown ticket version: ${String(parsed.version)}`); return;
    }
    if (TICKET_IS_V2 && parsed.providerEpoch == null) {
      setErrorMsg("Ticket is missing providerEpoch."); return;
    }
    if (typeof parsed.contract !== "string" || typeof parsed.customer !== "string" ||
        typeof parsed.nonce !== "string" || typeof parsed.signature !== "string") {
      setErrorMsg("Ticket contains invalid address or signature fields."); return;
    }

    // Client-side validation checks
    const now        = Math.floor(Date.now() / 1000);
    const chainOk    = parsed.chainId === TARGET_CHAIN_ID;
    const contractOk = parsed.contract.toLowerCase() === METERBOX.address.toLowerCase();
    let deadline: bigint;
    let amount: bigint;
    let limit: bigint;
    let epoch: bigint | undefined;
    try {
      deadline = BigInt(parsed.deadline);
      amount = BigInt(parsed.amount);
      limit = BigInt(parsed.spendingLimit);
      epoch = TICKET_IS_V2 ? BigInt(parsed.providerEpoch!) : undefined;
    } catch {
      setErrorMsg("Ticket contains invalid numeric fields."); setStep("error"); return;
    }
    if (deadline < 0n || deadline > 8640000000000n) {
      setErrorMsg("Ticket deadline is outside the supported date range."); setStep("error"); return;
    }
    setStep("validating");
    setTicket(parsed);
    const notExpired = deadline > BigInt(now);
    const amountOk   = amount > 0n && amount <= limit;
    let epochOk = true;
    if (TICKET_IS_V2) {
      try {
        if (!publicClient) throw new Error("RPC unavailable");
        const current = await publicClient.readContract({ ...METERBOX, functionName: "providerEpoch" });
        epochOk = epoch === (current as bigint);
      } catch {
        setErrorMsg("Could not verify the Mainnet provider epoch."); setStep("error"); return;
      }
    }

    // Recover signer from EIP-712 signature
    let signerOk = false;
    try {
      const recovered = await recoverTypedDataAddress({
        domain:      EIP712_DOMAIN,
        types:       EIP712_TYPES,
        primaryType: "UsageTicket",
        message: ticketMessage({
          customer:      parsed.customer as `0x${string}`,
          amount,
          spendingLimit: limit,
          deadline,
          nonce:         parsed.nonce as `0x${string}`,
          providerEpoch: epoch,
        }),
        signature: parsed.signature as `0x${string}`,
      });
      signerOk = recovered.toLowerCase() === parsed.customer.toLowerCase();
    } catch {
      signerOk = false;
    }

    const v: Validation = {
      chainOk, contractOk, signerOk, epochOk, notExpired,
      nonceOk:  null,  // filled once useReadContract resolves
      amountOk,
      balanceOk: null,
    };
    setValid(v);

    const allSync = chainOk && contractOk && signerOk && epochOk && notExpired && amountOk;
    setStep(allSync ? "valid" : "error");
    if (!allSync) {
      setErrorMsg("Ticket failed validation — see checks above.");
    }
  };

  // ── Simulate + submit ─────────────────────────────────────────────────────
  const handleSimulate = async () => {
    if (!ticket || !publicClient) return;
    setErrorMsg("");
    setStep("simulating");

    try {
      // eth_call simulation — catches Unauthorized, NonceUsed, InsufficientBalance etc
      await publicClient.simulateContract({
        ...METERBOX,
        functionName: "settle",
        args: [{
          customer:      ticket.customer as `0x${string}`,
          amount:        BigInt(ticket.amount),
          spendingLimit: BigInt(ticket.spendingLimit),
          deadline:      BigInt(ticket.deadline),
          nonce:         ticket.nonce as `0x${string}`,
          signature:     ticket.signature as `0x${string}`,
        }],
        account: address,
      });
      setStep("ready");
    } catch (e: unknown) {
      setErrorMsg(`Simulation failed: ${parseOnchainError(e)}`);
      setStep("error");
    }
  };

  const handleSubmit = async () => {
    if (!ticket) return;
    setErrorMsg("");
    setStep("pending");

    try {
      const hash = await writeContractAsync({
        ...METERBOX,
        functionName: "settle",
        args: [{
          customer:      ticket.customer as `0x${string}`,
          amount:        BigInt(ticket.amount),
          spendingLimit: BigInt(ticket.spendingLimit),
          deadline:      BigInt(ticket.deadline),
          nonce:         ticket.nonce as `0x${string}`,
          signature:     ticket.signature as `0x${string}`,
        }],
        chainId: TARGET_CHAIN_ID,
      });
      setHash(hash);
      setStep("confirming");
    } catch (e: unknown) {
      const err = e as { message?: string; code?: number } | null | undefined;
      const msg = err?.message?.toLowerCase() ?? "";
      if (msg.includes("user rejected") || err?.code === 4001) {
        setStep("ready"); return;
      }
      setErrorMsg(parseOnchainError(e));
      setStep("error");
    }
  };

  // Fetch post-settlement balances after confirmed
  const handleFetchPost = () => {
    void refetchCustomer();
    void refetchProvider();
  };

  const reset = () => {
    setStep("idle");
    setRaw("");
    setTicket(null);
    setValid(null);
    setErrorMsg("");
    setHash(undefined);
  };

  const isBusy   = step === "validating" || step === "simulating" || step === "pending" || isConfirming;
  const isDone   = effectiveStep === "done";
  const isReady  = effectiveStep === "ready";

  // Merge async nonce/balance checks into validation display
  const displayValid: Validation | null = validation ? {
    ...validation,
    nonceOk:   nonceUsed != null ? !(nonceUsed as boolean) : null,
    balanceOk: customerBal != null && ticket != null
      ? (customerBal as bigint) >= BigInt(ticket.amount)
      : null,
  } : null;

  const allValid = displayValid
      ? displayValid.chainOk && displayValid.contractOk && displayValid.signerOk && displayValid.epochOk
      && displayValid.notExpired && displayValid.nonceOk === true
      && displayValid.amountOk && displayValid.balanceOk === true
    : false;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Provider wallet pill */}
      <div className="rounded-xl px-3 py-2 flex items-center gap-2"
        style={{ background: "rgba(141,216,159,0.07)", border: "1px solid rgba(141,216,159,0.2)" }}>
        <ShieldCheck className="size-3.5 shrink-0" style={{ color: "var(--success)" }} />
        <span className="text-xs" style={{ color: "var(--subtle)" }}>Provider:</span>
        <span className="mono text-xs truncate" style={{ color: "var(--success)" }}>{address}</span>
      </div>

      {/* Ticket JSON input */}
      {!ticket && (
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--subtle)" }}>
            PASTE CUSTOMER TICKET JSON
          </label>
          <div className="glass-inner rounded-xl px-3 py-2.5">
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={5}
              placeholder={`{\n  "version": "${TICKET_VERSION}",\n  "chainId": …\n}`}
              disabled={isBusy}
              className="mono w-full bg-transparent text-xs outline-none placeholder:text-slate-600 disabled:opacity-50 resize-none"
              style={{ color: "var(--ink-2)" }}
            />
          </div>
        </div>
      )}

      {/* Validation checklist */}
      {displayValid && ticket && (
        <div className="rounded-xl px-4 py-3 space-y-1"
          style={{ background: "rgba(172,198,233,0.05)", border: "1px solid rgba(172,198,233,0.15)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--accent)" }}>TICKET VALIDATION</p>
          <Row label="Chain ID"        ok={displayValid.chainOk}    detail={`expected ${TARGET_CHAIN_ID}, got ${ticket.chainId}`} />
          <Row label="Contract"        ok={displayValid.contractOk} detail={`${ticket.contract.slice(0,10)}…`} />
          <Row label="Signer matches"  ok={displayValid.signerOk}   detail={`${ticket.customer.slice(0,10)}…`} />
          {TICKET_IS_V2 && <Row label="Provider epoch" ok={displayValid.epochOk} detail={ticket.providerEpoch} />}
          <Row label="Not expired"     ok={displayValid.notExpired} detail={new Date(Number(ticket.deadline) * 1000).toISOString()} />
          <Row label="Nonce unused"    ok={displayValid.nonceOk}    detail={displayValid.nonceOk === null ? "checking…" : ""} />
          <Row label="Amount ≤ limit"  ok={displayValid.amountOk}
            detail={`${Amount.fromRaw(BigInt(ticket.amount), decimals).toFixed(6)} ≤ ${Amount.fromRaw(BigInt(ticket.spendingLimit), decimals).toFixed(6)} USDC`}
          />
          <Row label="Customer balance" ok={displayValid.balanceOk}
            detail={
              displayValid.balanceOk === null ? "checking…"
              : customerBal != null
                ? `${Amount.fromRaw(customerBal as bigint, decimals).toFixed(6)} USDC on-chain`
                : ""
            }
          />
        </div>
      )}

      {/* Status banners */}
      {step === "validating" && (
        <div className="glass-inner rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="size-4 animate-spin shrink-0" style={{ color: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--muted)" }}>Validating ticket…</span>
        </div>
      )}

      {step === "simulating" && (
        <div className="glass-inner rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="size-4 animate-spin shrink-0" style={{ color: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--muted)" }}>Simulating on-chain (eth_call)…</span>
        </div>
      )}

      {isReady && (
        <div className="rounded-xl px-4 py-2.5 flex items-center gap-2"
          style={{ background: "rgba(141,216,159,0.08)", border: "1px solid rgba(141,216,159,0.25)" }}>
          <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--success)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--success)" }}>
            Simulation passed — ready to submit.
          </span>
        </div>
      )}

      {step === "pending" && (
        <div className="glass-inner rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="size-4 animate-spin shrink-0" style={{ color: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--muted)" }}>Confirm in wallet…</span>
        </div>
      )}

      {(step === "confirming" || effectiveStep === "confirming") && (
        <div className="glass-inner rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="size-4 animate-spin shrink-0" style={{ color: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--muted)" }}>Confirming on-chain…</span>
          {settledHash && (
            <a href={buildExplorerTx(settledHash)} target="_blank" rel="noreferrer"
              className="ml-auto flex items-center gap-1 text-xs shrink-0" style={{ color: "var(--accent)" }}>
              Tx <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}

      {isDone && settledHash && ticket && (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "rgba(141,216,159,0.08)", border: "1px solid rgba(141,216,159,0.3)" }}>
          {/* Success header */}
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--success)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                Settlement confirmed
              </span>
            </div>
            <a href={buildExplorerTx(settledHash)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
              Tx <ExternalLink className="size-3" />
            </a>
          </div>
          {/* Amounts */}
          <div className="px-4 pb-3 space-y-1.5" style={{ borderTop: "1px solid rgba(141,216,159,0.15)" }}>
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs" style={{ color: "var(--subtle)" }}>Settled</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: "var(--ink)" }}>
                {Amount.fromRaw(BigInt(ticket.amount), decimals).toFixed(6)} USDC
              </span>
            </div>
            {/* Post-settlement balances (fetched on demand) */}
            {(postCustomerBal != null || postProviderBal != null) && (
              <>
                {postCustomerBal != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "var(--subtle)" }}>
                      Customer balance now
                    </span>
                    <span className="mono text-xs" style={{ color: "var(--ink-2)" }}>
                      {Amount.fromRaw(postCustomerBal as bigint, decimals).toFixed(6)} USDC
                    </span>
                  </div>
                )}
                {postProviderBal != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "var(--subtle)" }}>
                      Provider balance now
                    </span>
                    <span className="mono text-xs" style={{ color: "var(--ink-2)" }}>
                      {Amount.fromRaw(postProviderBal as bigint, decimals).toFixed(6)} USDC
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs" style={{ color: "var(--subtle)" }}>Customer</span>
              <a href={buildExplorerAddress(ticket.customer)} target="_blank" rel="noreferrer"
                className="mono text-xs hover:underline" style={{ color: "var(--accent)" }}>
                {ticket.customer.slice(0,10)}…{ticket.customer.slice(-6)}
                <ExternalLink className="inline size-2.5 ml-0.5" />
              </a>
            </div>
          </div>
          {/* Refresh balances button */}
          <div className="px-4 pb-3">
            <button
              onClick={handleFetchPost}
              className="text-xs hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Refresh post-settlement balances
            </button>
          </div>
        </div>
      )}

      {effectiveError && (
        <div className="flex items-start gap-2 px-1">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
          <p className="text-xs" style={{ color: "var(--danger)" }}>{effectiveError}</p>
        </div>
      )}

      {/* Action buttons */}
      {isDone ? (
        <button
          onClick={reset}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold"
          style={{ background: "var(--surface-strong)", color: "var(--ink-2)", border: "1px solid var(--border)" }}
        >
          Settle Another Ticket
        </button>
      ) : effectiveStep === "error" ? (
        <button
          onClick={reset}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold"
          style={{ background: "var(--surface-strong)", color: "var(--ink-2)", border: "1px solid var(--border)" }}
        >
          Reset
        </button>
      ) : isReady ? (
        <button
          onClick={() => { void handleSubmit(); }}
          disabled={isBusy}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: "var(--accent)", color: "#0d1b2f" }}
        >
          Submit Settlement
        </button>
      ) : step === "valid" || (displayValid && allValid) ? (
        <button
          onClick={() => { void handleSimulate(); }}
          disabled={isBusy || !allValid}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: allValid ? "var(--accent)" : "var(--surface-strong)", color: allValid ? "#0d1b2f" : "var(--subtle)" }}
        >
          {isBusy
            ? <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />Simulating…
              </span>
            : "Simulate Settlement"
          }
        </button>
      ) : (
        <button
          onClick={() => { void handleValidate(); }}
          disabled={isBusy || !raw.trim()}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-40 transition-all hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: "var(--accent)", color: "#0d1b2f" }}
        >
          {isBusy
            ? <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />Validating…
              </span>
            : "Validate Ticket"
          }
        </button>
      )}
    </div>
  );
}
