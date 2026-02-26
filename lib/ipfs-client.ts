/**
 * IPFS Client - Upload files to IPFS using Pinata
 * 
 * This module provides functions to upload files and JSON to IPFS
 * for permanent storage of NFT assets.
 */

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

/**
 * Upload a file to IPFS via Pinata
 * 
 * @param file - The file to upload (Blob or File)
 * @returns IPFS hash (CID) prefixed with ipfs://
 */
export async function uploadFileToIPFS(file: Blob): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('Pinata API credentials not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(PINATA_API_URL, {
    method: 'POST',
    headers: {
      'pinata_api_key': apiKey,
      'pinata_secret_api_key': apiSecret,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return `ipfs://${result.IpfsHash}`;
}

/**
 * Upload JSON metadata to IPFS via Pinata
 * 
 * @param json - The JSON object to upload
 * @param name - Optional name for the pin
 * @returns IPFS hash (CID) prefixed with ipfs://
 */
export async function uploadJSONToIPFS(json: any, name?: string): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('Pinata API credentials not configured');
  }

  const response = await fetch(PINATA_JSON_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'pinata_api_key': apiKey,
      'pinata_secret_api_key': apiSecret,
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: name ? { name } : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata JSON upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return `ipfs://${result.IpfsHash}`;
}

/**
 * Convert IPFS URI to HTTP gateway URL
 * 
 * @param ipfsUri - The ipfs:// URI
 * @param gateway - Optional custom gateway URL
 * @returns HTTP URL for the IPFS content
 */
export function toGatewayUrl(ipfsUri: string, gateway: string = 'https://gateway.pinata.cloud/ipfs/'): string {
  if (!ipfsUri.startsWith('ipfs://')) {
    return ipfsUri;
  }
  const hash = ipfsUri.replace('ipfs://', '');
  return `${gateway}${hash}`;
}
