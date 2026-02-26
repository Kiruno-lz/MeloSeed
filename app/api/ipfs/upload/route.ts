import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToIPFS } from '@/lib/ipfs-client';

/**
 * IPFS Upload API
 * 
 * POST /api/ipfs/upload
 * Body: FormData with 'file' field
 * 
 * Returns: { ipfshash: string }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`📤 Uploading file to IPFS: ${file.size} bytes`);

    const ipfsHash = await uploadFileToIPFS(file);

    console.log(`✅ File uploaded to IPFS: ${ipfsHash}`);

    return NextResponse.json({ ipfshash: ipfsHash });
  } catch (error) {
    console.error('❌ IPFS upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
