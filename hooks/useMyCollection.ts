import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';

// Since we can't reliably use logs on Monad Testnet due to strict block range limits and lack of indexer,
// and ERC1155 doesn't have `tokenOfOwnerByIndex` like ERC721Enumerable,
// we have to use a "brute-force" check strategy for this MVP.
// We will check the balances of Token IDs from 0 up to `_nextTokenId` (we need to guess or read a range).
// A better way is to read the `TransferSingle` events only for the very latest blocks to catch NEW mints,
// but for past history, it's hard without an indexer.

// ALTERNATIVE STRATEGY:
// Since we are the ones minting, maybe we can rely on the fact that IDs are sequential starting from 0.
// We can check `balanceOf(user, 0)`, `balanceOf(user, 1)`, etc. until we hit a sequence of zeros or a limit.
// This is slow but reliable for small collections.

export function useMyCollection(contractAddress: `0x${string}`) {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [tokenIds, setTokenIds] = useState<bigint[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCollection = useCallback(async () => {
        if (!address || !publicClient || !contractAddress) return;
        
        setIsLoading(true);
        try {
            // Strategy: Brute-force check the first 50 IDs (assuming devnet usage is low).
            // In production, you MUST use an Indexer (The Graph/Goldsky).
            const maxIdToCheck = 500; 
            const idsToCheck = Array.from({ length: maxIdToCheck }, (_, i) => BigInt(i));
            const userAddresses = Array(maxIdToCheck).fill(address);

            // Use `balanceOfBatch` if available in ERC1155 (Standard)
            // function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids)
            
            const balances = await publicClient.readContract({
                address: contractAddress,
                abi: [
                    {
                        name: 'balanceOfBatch',
                        type: 'function',
                        stateMutability: 'view',
                        inputs: [
                            { name: 'accounts', type: 'address[]' },
                            { name: 'ids', type: 'uint256[]' }
                        ],
                        outputs: [{ name: '', type: 'uint256[]' }]
                    }
                ],
                functionName: 'balanceOfBatch',
                args: [userAddresses, idsToCheck]
            }) as bigint[];

            const foundIds: bigint[] = [];
            balances.forEach((bal, index) => {
                if (bal > BigInt(0)) {
                    foundIds.push(idsToCheck[index]);
                }
            });

            setTokenIds(foundIds);
        } catch (e) {
            console.error("Failed to fetch collection balances:", e);
        } finally {
            setIsLoading(false);
        }
    }, [address, publicClient, contractAddress]);

    useEffect(() => {
        fetchCollection();
    }, [fetchCollection]);

    return { tokenIds, isLoading, refetch: fetchCollection };
}
