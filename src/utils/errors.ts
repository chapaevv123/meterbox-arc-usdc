export function parseOnchainError(error: unknown): string {
  const e = error as { message?: string; code?: number } | null | undefined;
  const msg = e?.message?.toLowerCase() ?? "";

  if (msg.includes("user rejected") || e?.code === 4001) return "";
  if (msg.includes("insufficient funds") || msg.includes("exceeds balance")) {
    return "Insufficient balance. Please add funds and try again.";
  }
  if (msg.includes("reverted")) {
    const reasonMatch = e?.message?.match(/reason="([^"]+)"/);
    if (reasonMatch) return `Transaction failed: ${reasonMatch[1]}`;
    // Parse common MeterBox errors
    if (msg.includes("insufficientbalance")) return "Insufficient MeterBox balance.";
    if (msg.includes("ticketexpired")) return "Ticket has expired.";
    if (msg.includes("nonceused")) return "This nonce has already been used.";
    if (msg.includes("invalidsignature")) return "Invalid signature.";
    if (msg.includes("spendinglimitexceeded")) return "Spending limit exceeded.";
    if (msg.includes("unauthorized")) return "Not authorized (wrong caller).";
    if (msg.includes("zeroamount")) return "Amount cannot be zero.";
    return "Transaction failed. Please try again.";
  }
  if (msg.includes("network") || msg.includes("timeout")) {
    return "Network error. Check connection and retry.";
  }
  if (e?.message) return e.message.slice(0, 120);
  return "Something went wrong. Please try again.";
}
