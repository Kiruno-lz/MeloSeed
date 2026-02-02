import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const pinataJWT = process.env.PINATA_JWT;

    if (!pinataJWT) {
      console.error('PINATA_JWT is not set');
      // For development/demo purposes without keys, we might return a mock hash or fail.
      // Failing is better so the user knows they need keys.
      return NextResponse.json({ error: 'Server configuration error: PINATA_JWT not set' }, { status: 500 });
    }

    const uploadData = new FormData();
    uploadData.append('file', file);
    // Optional: Add pinataMetadata or pinataOptions if needed

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pinataJWT}`,
      },
      body: uploadData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Pinata upload failed:', errorText);
      return NextResponse.json({ error: `Pinata upload failed: ${res.statusText}` }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json({
      ipfshash: json.IpfsHash,
      pinSize: json.PinSize,
      timestamp: json.Timestamp,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
