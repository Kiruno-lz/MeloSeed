import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { MELO_SEED_ABI } from '@/lib/constants';

/**
 * useMyCollection Hook
 * 
 * Fetches the list of NFTs owned by the current user.
 * 
 * PROBLEM:
 * On high-throughput testnets like Monad, standard `eth_getLogs` (Event fetching) is often 
 * unreliable or restricted by strict block range limits (e.g., 2000 blocks).
 * Additionally, ERC1155 does not have `tokenOfOwnerByIndex` (Enumerable extension) by default.
 * 
 * SOLUTION (MVP Strategy):
 * We use a "Brute-force Batch Check" strategy.
 * 1. We assume Token IDs are sequential starting from 0.
 * 2. We construct a batch of IDs (e.g., 0 to 49).
 * 3. We call `balanceOfBatch` to check the user's balance for ALL these IDs in a single RPC call.
 * 
 * LIMITATIONS:
 * - Only detects IDs within the checked range (0-50).
 * - Not scalable for production with thousands of IDs (requires an Indexer like The Graph).
 * - Ideal for Hackathons/MVPs where the total supply is low.
 */
export function useMyCollection(contractAddress: `0x${string}`) {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [tokenIds, setTokenIds] = useState<bigint[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCollection = useCallback(async () => {
        if (!address || !publicClient || !contractAddress) return;
        
        setIsLoading(true);
        try {
            // Define the range to check. 
            // In a real app, you might fetch 'totalSupply' first if available, 
            // or use an Indexer.
            const maxIdToCheck = 50; 
            const idsToCheck = Array.from({ length: maxIdToCheck }, (_, i) => BigInt(i));
            
            // Prepare arrays for balanceOfBatch: [user, user, user...] and [0, 1, 2...]
            const userAddresses = Array(maxIdToCheck).fill(address);

            // Execute single batch call
            const balances = await publicClient.readContract({
                address: contractAddress,
                abi: MELO_SEED_ABI,
                functionName: 'balanceOfBatch',
                args: [userAddresses, idsToCheck]
            }) as bigint[];

            // Filter IDs where balance > 0
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
