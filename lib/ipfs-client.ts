export async function uploadFileToIPFS(file: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/ipfs/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Upload failed');
  }

  const data = await res.json();
  return `ipfs://${data.ipfshash}`;
}

export async function uploadJSONToIPFS(json: any): Promise<string> {
  const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
  return uploadFileToIPFS(blob);
}

export function base64ToBlob(base64: string, type: string = 'audio/mp3'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}
