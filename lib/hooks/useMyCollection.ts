import { useState, useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { MELO_SEED_ABI } from '@/lib/constants';

export function useMyCollection(contractAddress: `0x${string}`) {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [tokenIds, setTokenIds] = useState<bigint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const addressRef = useRef(address);
    const publicClientRef = useRef(publicClient);
    const contractAddressRef = useRef(contractAddress);
    
    useEffect(() => {
        addressRef.current = address;
        publicClientRef.current = publicClient;
        contractAddressRef.current = contractAddress;
    }, [address, publicClient, contractAddress]);

    const fetchCollection = useCallback(async () => {
        const addr = addressRef.current;
        const client = publicClientRef.current;
        const contract = contractAddressRef.current;
        
        if (!addr || !client || !contract) return;
        
        setIsLoading(true);
        try {
            const maxIdToCheck = 50;
            const batchSize = 10;
            const foundIds: bigint[] = [];
            
            for (let start = 0; start < maxIdToCheck; start += batchSize) {
                const end = Math.min(start + batchSize, maxIdToCheck);
                const batchIds = Array.from({ length: end - start }, (_, i) => BigInt(start + i));
                const batchAddresses = Array(end - start).fill(addr);

                const balances = await client.readContract({
                    address: contract,
                    abi: MELO_SEED_ABI,
                    functionName: 'balanceOfBatch',
                    args: [batchAddresses, batchIds]
                }) as bigint[];

                balances.forEach((bal, index) => {
                    if (bal > BigInt(0)) {
                        foundIds.push(batchIds[index]);
                    }
                });
            }

            setTokenIds(foundIds);
        } catch (e) {
            console.error("Failed to fetch collection balances:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCollection();
    }, [fetchCollection]);

    return { tokenIds, isLoading, refetch: fetchCollection };
}
