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
            const idsToCheck = Array.from({ length: maxIdToCheck }, (_, i) => BigInt(i));
            const userAddresses = Array(maxIdToCheck).fill(addr);

            const balances = await client.readContract({
                address: contract,
                abi: MELO_SEED_ABI,
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
    }, []);

    useEffect(() => {
        fetchCollection();
    }, [fetchCollection]);

    return { tokenIds, isLoading, refetch: fetchCollection };
}
