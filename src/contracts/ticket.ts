import { ARC_MAINNET_CHAIN_ID, METERBOX, TARGET_CHAIN_ID } from "./meterbox";

// The existing Arc Studio Testnet deployment retains its v1 schema.
// The locally revised Mainnet contract uses v2 and invalidates tickets on provider rotation.
export const TICKET_IS_V2 = TARGET_CHAIN_ID === ARC_MAINNET_CHAIN_ID;
export const TICKET_VERSION = TICKET_IS_V2 ? "MeterBox-v2" : "MeterBox-v1";

export const EIP712_DOMAIN = {
  name: "MeterBox",
  version: TICKET_IS_V2 ? "2" : "1",
  chainId: TARGET_CHAIN_ID,
  verifyingContract: METERBOX.address,
} as const;

const BASE_FIELDS = [
  { name: "customer", type: "address" },
  { name: "amount", type: "uint256" },
  { name: "spendingLimit", type: "uint256" },
  { name: "deadline", type: "uint256" },
  { name: "nonce", type: "bytes32" },
] as const;

export const EIP712_TYPES = {
  UsageTicket: TICKET_IS_V2
    ? [...BASE_FIELDS, { name: "providerEpoch", type: "uint256" } as const]
    : BASE_FIELDS,
} as const;

export function ticketMessage(input: {
  customer: `0x${string}`;
  amount: bigint;
  spendingLimit: bigint;
  deadline: bigint;
  nonce: `0x${string}`;
  providerEpoch?: bigint;
}) {
  const base = {
    customer: input.customer,
    amount: input.amount,
    spendingLimit: input.spendingLimit,
    deadline: input.deadline,
    nonce: input.nonce,
  };
  if (TICKET_IS_V2 && input.providerEpoch === undefined) throw new Error("Provider epoch unavailable");
  // Extra message properties are ignored by EIP-712 encoders when v1 fields are selected.
  return { ...base, providerEpoch: input.providerEpoch ?? 0n };
}
