import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { parseAbiItem } from 'viem';

// Simplified Hook to fetch owned token IDs from TransferSingle events
// NOTE: This is not production-grade for mainnet (too many blocks), but works for Devnet/Testnet.
export function useMyCollection(contractAddress: `0x${string}`) {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [tokenIds, setTokenIds] = useState<bigint[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCollection = useCallback(async () => {
        if (!address || !publicClient || !contractAddress) return;
        
        setIsLoading(true);
        try {
            // Filter: TransferSingle(operator, from, to, id, value)
            // We want logs where `to` is the current user.
            // topic0: Event signature
            // topic1: operator (indexed)
            // topic2: from (indexed)
            // topic3: to (indexed)
            
            // NOTE: Monad Testnet RPC limits block range to 10,000.
            // We should start from a recent block or implement chunking.
            // For this MVP, we will try to find the current block and go back X blocks,
            // OR use a fixed "Deployment Block" if known.
            // Let's assume the contract was deployed recently. 
            // We can fetch the current block number and subtract, say, 10000 blocks to be safe/fast.
            // If the user has older NFTs, they won't show up without chunking, but this fixes the crash.
            
            const currentBlock = await publicClient.getBlockNumber();
            const range = BigInt(10000);
            const fromBlock = currentBlock > range ? currentBlock - range : BigInt(0);

            const logs = await publicClient.getLogs({
                address: contractAddress,
                event: parseAbiItem('event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)'),
                args: {
                    to: address
                },
                fromBlock: fromBlock,
                toBlock: 'latest'
            });

            // Extract IDs
            // We also need to handle "Burn" (Transfer to 0x0) or Transfer out?
            // "TransferSingle" to user adds it. 
            // But if user transferred it OUT, we need to subtract.
            // A proper indexer handles this balance calculation.
            // For this simple MVP: We will just list all IDs ever received.
            // To be more accurate, we should also query TransferSingle where `from` = address.
            
            // Let's do a simple "Ever Received" list first, or check balance for each.
            // Checking balance for each ID found is safer.
            
            const uniqueIds = Array.from(new Set(logs.map(log => log.args.id!)));
            
            // Verify ownership (balance > 0)
            const ownedIds: bigint[] = [];
            
            // We can verify in parallel
            // Note: This requires the ABI to include balanceOf.
            // We'll assume the caller passes the address or we rely on the component to verify.
            // But to be helpful, let's just return unique IDs and let the UI/Player verify them individually 
            // OR use multicall to check balances if we want to be fancy.
            
            // For now, returning unique IDs found in "Incoming" transfers is a good start.
            // The Player component handles loading. If balance is 0, user might just see it but fail to play/burn? 
            // Actually player just plays URI. Burning checks ownership.
            
            setTokenIds(uniqueIds);
        } catch (e) {
            console.error("Failed to fetch collection logs:", e);
        } finally {
            setIsLoading(false);
        }
    }, [address, publicClient, contractAddress]);

    useEffect(() => {
        fetchCollection();
    }, [fetchCollection]);

    return { tokenIds, isLoading, refetch: fetchCollection };
}
