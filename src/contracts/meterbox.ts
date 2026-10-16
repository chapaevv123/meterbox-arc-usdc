import abi from "./MeterBox.abi.json";
import { requireChain } from "@/onchain-facts";
import { isAddress } from "viem";

// Arc Testnet chain ID — confirmed on-chain
export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_MAINNET_CHAIN_ID = 5042;

// Determine active network from env (defaults to testnet)
const useMainnet = import.meta.env.VITE_USE_MAINNET === "true";
export const TARGET_CHAIN_ID = useMainnet ? ARC_MAINNET_CHAIN_ID : ARC_TESTNET_CHAIN_ID;

// Contract address injected from env (set after mainnet deploy); falls back to testnet deployment
const envAddress = import.meta.env.VITE_METERBOX_ADDRESS as string | undefined;
if (useMainnet && (!envAddress || !isAddress(envAddress) ||
    envAddress.toLowerCase() === "0xc904569da992f343d0968454abe7486457a1a8f6" ||
    envAddress.toLowerCase() === "0x0000000000000000000000000000000000000000")) {
  throw new Error("VITE_METERBOX_ADDRESS must be a valid Arc Mainnet contract address");
}
if (envAddress && !isAddress(envAddress)) {
  throw new Error("VITE_METERBOX_ADDRESS is not a valid address");
}
export const METERBOX_ADDRESS = (
  envAddress ?? "0xc904569da992f343d0968454abe7486457a1a8f6"
) as `0x${string}`;

export const METERBOX_ABI = abi;

export const METERBOX = {
  address: METERBOX_ADDRESS,
  abi: METERBOX_ABI,
} as const;

export function getExplorerBase(): string {
  return requireChain(TARGET_CHAIN_ID).explorerBase;
}

export function buildExplorerTx(hash: string): string {
  return `${getExplorerBase()}/tx/${hash}`;
}

export function buildExplorerAddress(addr: string): string {
  return `${getExplorerBase()}/address/${addr}`;
}
