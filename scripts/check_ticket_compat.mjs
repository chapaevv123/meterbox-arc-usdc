import { hashTypedData } from 'viem';

const domain = { name: 'MeterBox', version: '1', chainId: 5042002, verifyingContract: '0xc904569da992f343d0968454abe7486457a1a8f6' };
const types = { UsageTicket: [
  { name: 'customer', type: 'address' },
  { name: 'amount', type: 'uint256' },
  { name: 'spendingLimit', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' },
] };
const message = { customer: '0x1111111111111111111111111111111111111111', amount: 1n, spendingLimit: 1n, deadline: 2n, nonce: `0x${'11'.repeat(32)}` };
const original = hashTypedData({ domain, types, primaryType: 'UsageTicket', message });
const withIgnoredEpoch = hashTypedData({ domain, types, primaryType: 'UsageTicket', message: { ...message, providerEpoch: 0n } });
if (original !== withIgnoredEpoch) throw new Error('V1 ticket hash changed');
const v2Domain = { ...domain, version: '2', chainId: 5042, verifyingContract: '0x2222222222222222222222222222222222222222' };
const v2Types = { UsageTicket: [...types.UsageTicket, { name: 'providerEpoch', type: 'uint256' }] };
const v2AtZero = hashTypedData({ domain: v2Domain, types: v2Types, primaryType: 'UsageTicket', message: { ...message, providerEpoch: 0n } });
const v2AtOne = hashTypedData({ domain: v2Domain, types: v2Types, primaryType: 'UsageTicket', message: { ...message, providerEpoch: 1n } });
if (v2AtZero === v2AtOne || original === v2AtZero) throw new Error('Epoch or version did not bind ticket');
console.log('v1 compatibility and v2 epoch hash separation: PASS');
