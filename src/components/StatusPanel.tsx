import { useReadContract } from "wagmi";
import { METERBOX, TARGET_CHAIN_ID, METERBOX_ADDRESS, buildExplorerAddress } from "@/contracts/meterbox";
import { ExternalLink, Shield, Clock, Percent, User } from "lucide-react";
import { requireChain } from "@/onchain-facts";

const CHAIN = requireChain(TARGET_CHAIN_ID);

export function StatusPanel() {
  const { data: provider } = useReadContract({ ...METERBOX, functionName: "provider", chainId: TARGET_CHAIN_ID });
  const { data: feeRate } = useReadContract({ ...METERBOX, functionName: "feeRateBps", chainId: TARGET_CHAIN_ID });
  const { data: maxFee } = useReadContract({ ...METERBOX, functionName: "maxFeeRateBps", chainId: TARGET_CHAIN_ID });
  const { data: chainIdData } = useReadContract({ ...METERBOX, functionName: "deployedChainId", chainId: TARGET_CHAIN_ID });
  const { data: usdcToken } = useReadContract({ ...METERBOX, functionName: "usdcToken", chainId: TARGET_CHAIN_ID });
  const { data: owner } = useReadContract({ ...METERBOX, functionName: "owner", chainId: TARGET_CHAIN_ID });

  const rows = [
    {
      icon: <Shield className="size-4" />,
      label: "Contract",
      value: METERBOX_ADDRESS,
      link: buildExplorerAddress(METERBOX_ADDRESS),
      mono: true,
    },
    {
      icon: <User className="size-4" />,
      label: "Owner",
      value: owner ? `${(owner as string).slice(0, 10)}…${(owner as string).slice(-6)}` : "…",
      mono: true,
    },
    {
      icon: <User className="size-4" />,
      label: "Provider",
      value: provider ? `${(provider as string).slice(0, 10)}…${(provider as string).slice(-6)}` : "…",
      mono: true,
    },
    {
      icon: <Percent className="size-4" />,
      label: "Fee Rate",
      value: feeRate != null ? `${(Number(feeRate) / 100).toFixed(2)}%` : "…",
    },
    {
      icon: <Percent className="size-4" />,
      label: "Max Fee Cap",
      value: maxFee != null ? `${(Number(maxFee) / 100).toFixed(2)}%` : "…",
    },
    {
      icon: <Clock className="size-4" />,
      label: "Param Timelock",
      value: "2 days",
    },
    {
      icon: <Shield className="size-4" />,
      label: "USDC Token",
      value: usdcToken ? `${(usdcToken as string).slice(0, 10)}…${(usdcToken as string).slice(-6)}` : "…",
      link: usdcToken ? buildExplorerAddress(usdcToken as string) : undefined,
      mono: true,
    },
    {
      icon: <Shield className="size-4" />,
      label: "Chain",
      value: chainIdData != null ? `${CHAIN.name} (${Number(chainIdData)})` : "…",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs mb-4" style={{ color: "var(--subtle)" }}>
        Live contract state read directly from {CHAIN.name}. No simulation.
      </p>
      {rows.map(({ icon, label, value, link, mono }) => (
        <div key={label} className="glass-inner rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <span style={{ color: "var(--subtle)" }}>{icon}</span>
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{label}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-xs font-medium truncate ${mono ? "mono" : ""}`}
              style={{ color: "var(--ink-2)" }}
              title={typeof value === "string" ? value : undefined}
            >
              {value}
            </span>
            {link && (
              <a href={link} target="_blank" rel="noreferrer" style={{ color: "var(--subtle)" }}>
                <ExternalLink className="size-3 shrink-0" />
              </a>
            )}
          </div>
        </div>
      ))}

      <div className="glass-inner rounded-xl px-4 py-4 mt-4 space-y-2">
        <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Security Properties</p>
        {[
          "Non-upgradeable · no proxy, no initializer",
          "Ownable2Step · two-step ownership transfer",
          "2-day timelock on provider, fee rate, fee recipient",
          "EIP-712 signed tickets with nonce replay protection",
          "Per-customer nonce scope · no cross-user griefing",
          "Spending limit enforced per ticket",
          "ReentrancyGuard on all state-changing paths",
          "SafeERC20 on all token transfers",
          "Chain ID bound · rejects cross-chain replays",
        ].map((line) => (
          <p key={line} className="text-xs flex items-center gap-2" style={{ color: "var(--muted)" }}>
            <span style={{ color: "var(--success)" }}>✓</span> {line}
          </p>
        ))}
      </div>
    </div>
  );
}
