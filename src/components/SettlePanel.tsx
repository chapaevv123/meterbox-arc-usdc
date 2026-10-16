/**
 * SettlePanel — role-detecting orchestrator for the two-role settle flow.
 *
 * Reads `provider()` live from the contract, detects which role the
 * connected wallet holds, and renders the correct sub-component:
 *
 *   Customer (any wallet)    → CustomerTicket  (sign + copy ticket)
 *   Provider (0x5B12…)      → ProviderSettle  (validate + simulate + submit)
 *
 * No settlement is ever attempted from a customer wallet.
 */
import { useState } from "react";
import { useAccount, useReadContract, useSwitchChain } from "wagmi";
import { ConnectKitButton } from "connectkit";
import { Loader2, Users, ShieldCheck } from "lucide-react";
import { METERBOX, TARGET_CHAIN_ID } from "@/contracts/meterbox";
import { CustomerTicket } from "./CustomerTicket";
import { ProviderSettle } from "./ProviderSettle";

type RoleTab = "customer" | "provider";

export function SettlePanel() {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Read authorized provider live from the deployed contract
  const { data: providerAddr, isLoading: providerLoading } = useReadContract({
    ...METERBOX,
    functionName: "provider",
    chainId: TARGET_CHAIN_ID,
  });

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN_ID;
  const isProvider   = !!address && !!providerAddr &&
    address.toLowerCase() === (providerAddr as string).toLowerCase();

  // Tab selection: user can override; default follows role (provider wallet → provider tab).
  // Derived during render — no effect needed.
  const [manualTab, setManualTab] = useState<RoleTab | null>(null);
  const activeTab: RoleTab = manualTab ?? (isProvider ? "provider" : "customer");

  const providerAddrStr = providerAddr as string | undefined;

  return (
    <div className="space-y-4">

      {/* Role tab bar */}
      <div className="flex gap-2 rounded-2xl p-1"
        style={{ background: "var(--surface-strong)", border: "1px solid var(--border)" }}>
        {([
          { id: "customer" as RoleTab, label: "Customer", Icon: Users },
          { id: "provider" as RoleTab, label: "Provider", Icon: ShieldCheck },
        ]).map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const isMyRole: boolean =
            (id === "provider" && isProvider) ||
            (id === "customer" && !isProvider && isConnected);
          return (
            <button
              key={id}
              onClick={() => setManualTab(id)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
              style={{
                background: isActive ? "var(--bg)" : "transparent",
                color: isActive
                  ? (isMyRole ? "var(--ink)" : "var(--ink-2)")
                  : "var(--subtle)",
                border: isActive ? "1px solid var(--border-strong)" : "1px solid transparent",
              }}
            >
              <Icon className="size-3.5" />
              {label}
              {isMyRole && isActive && (
                <span
                  className="size-1.5 rounded-full ml-0.5 inline-block"
                  style={{ background: "var(--success)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Provider address info line */}
      {!providerLoading && providerAddrStr && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs" style={{ color: "var(--subtle)" }}>Authorized provider:</span>
          <span className="mono text-xs" style={{ color: "var(--muted)" }}>
            {providerAddrStr.slice(0, 10)}…{providerAddrStr.slice(-6)}
          </span>
        </div>
      )}

      {/* Not connected */}
      {!isConnected && (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm" style={{ color: "var(--subtle)" }}>
            Connect your wallet to continue.
          </p>
          <ConnectKitButton />
        </div>
      )}

      {/* Wrong chain */}
      {isConnected && isWrongChain && (
        <button
          onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
          disabled={isSwitching}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#0d1b2f" }}
        >
          {isSwitching ? "Switching…" : "Switch to Arc Testnet"}
        </button>
      )}

      {/* Loading provider */}
      {isConnected && !isWrongChain && providerLoading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="size-4 animate-spin" style={{ color: "var(--accent)" }} />
          <span className="text-sm" style={{ color: "var(--subtle)" }}>Loading contract…</span>
        </div>
      )}

      {/* Sub-components */}
      {isConnected && !isWrongChain && !providerLoading && (
        <>
          {activeTab === "customer" && <CustomerTicket />}

          {activeTab === "provider" && (
            isProvider
              ? <ProviderSettle />
              : (
                <div className="rounded-xl px-4 py-4 space-y-3"
                  style={{ background: "rgba(172,198,233,0.05)", border: "1px solid rgba(172,198,233,0.15)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
                    Provider wallet not connected
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Settlement must be submitted by the authorized provider wallet:
                  </p>
                  {providerAddrStr && (
                    <p className="mono text-xs break-all" style={{ color: "var(--accent)" }}>
                      {providerAddrStr}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Switch to that wallet in MetaMask to submit settlements. If you do not
                    control that address, see the redeployment plan in{" "}
                    <code className="text-xs" style={{ color: "var(--ink-2)" }}>
                      docs/mainnet-deployment-plan.md
                    </code>{" "}
                    to deploy a new contract with your own wallet as provider.
                  </p>
                </div>
              )
          )}
        </>
      )}
    </div>
  );
}
