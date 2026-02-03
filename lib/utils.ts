import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolves an IPFS URI to a public HTTP gateway URL.
 * Handles 'ipfs://' prefix.
 * @param uri The URI to resolve
 * @returns The resolved HTTP URL
 */
export function resolveIpfsUrl(uri: string): string {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return uri;
}
