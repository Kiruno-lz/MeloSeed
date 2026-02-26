export const CONTRACT_ADDRESS = '0x6fcB586F6cc107A10AA50C32432B06b2E9D4bdBE';

export const MELO_SEED_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'string', name: 'seed', type: 'string' },
      { internalType: 'string', name: 'metadataUri', type: 'string' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }, { internalType: 'uint256', name: 'id', type: 'uint256' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'uri',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
        { internalType: 'address', name: 'account', type: 'address' },
        { internalType: 'uint256', name: 'id', type: 'uint256' },
        { internalType: 'uint256', name: 'value', type: 'uint256' }
    ],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'accounts', type: 'address[]' },
      { internalType: 'uint256[]', name: 'ids', type: 'uint256[]' }
    ],
    name: 'balanceOfBatch',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getTokenData',
    outputs: [
      { internalType: 'string', name: 'seed', type: 'string' },
      { internalType: 'string', name: 'metadataUri', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function',
  }
] as const;
