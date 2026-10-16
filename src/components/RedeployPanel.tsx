import { useState } from "react";
import { Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { TARGET_CHAIN_ID } from "@/contracts/meterbox";
import { requireChain, getUsdc } from "@/onchain-facts";

const OWNER = "0x6Fa3659a15e9264E43EC67Fe4bB5d31D38109A42";
const PROVIDER = "0x765fb7e6a0BdDDc29f57eeCE34AEda0Fb318805d";
const CHAIN = requireChain(TARGET_CHAIN_ID);
const USDC = getUsdc(TARGET_CHAIN_ID);
const dryRun = `forge script contracts/script/DeployMeterBox.s.sol:DeployMeterBox --rpc-url ${CHAIN.rpcUrls[0]} --sender ${OWNER}`;

export function RedeployPanel() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(172,198,233,0.08)", border: "1px solid var(--border)" }}>
        <ShieldCheck className="size-4 shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          Deployment preparation only. The command below simulates a deployment and sends no transaction.
          A real Arc deployment requires a separate owner decision and hardware-wallet confirmation.
        </p>
      </div>
      <div className="glass-inner rounded-xl px-4 py-3 space-y-2 text-xs mono break-all" style={{ color: "var(--ink-2)" }}>
        <p>Network: {CHAIN.name} ({TARGET_CHAIN_ID})</p>
        <p>Owner: {OWNER}</p>
        <p>Provider: {PROVIDER}</p>
        <p>USDC ERC-20: {USDC?.address ?? "Unavailable"} (6 decimals)</p>
        <p>Maximum fee: 500 bps</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase" style={{ color: "var(--subtle)" }}>Read-only simulation</span>
          <button type="button" onClick={() => { void navigator.clipboard.writeText(dryRun).then(() => setCopied(true)); }}
            className="flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
            <Copy className="size-3" />{copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="glass-inner rounded-xl px-4 py-3 text-xs mono overflow-x-auto whitespace-pre-wrap break-all" style={{ color: "var(--muted)" }}>{dryRun}</pre>
      </div>
      {CHAIN.isTestnet && <a href="https://explorer.testnet.arc.io/address/0xc904569da992f343d0968454abe7486457a1a8f6"
        target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
        Existing Arc Studio testnet deployment <ExternalLink className="size-3" />
      </a>}
    </div>
  );
}
