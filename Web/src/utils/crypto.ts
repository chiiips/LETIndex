let key: CryptoKey | null = null;

export async function loadKey() {
  try {
    const response = await fetch('/key.bin')
    const keyBuffer = await response.arrayBuffer()
    
    key = await window.crypto.subtle.importKey(
      'raw',
      new Uint8Array(keyBuffer),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    console.log('load key success')
  } catch (error) {
    console.error('load key failed:', error)
    throw error
  }
}

export async function decryptValue(encryptedHex: string, rowIndex: number): Promise<number> {
  if (!key) {
    throw new Error('key not loaded')
  }

  try {
    const encryptedBytes = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
    
    const iv = new Uint8Array(12)
    const rowIndexBytes = new Uint8Array(new Uint32Array([rowIndex]).buffer)
    iv.set(rowIndexBytes)
    
    const ciphertext = encryptedBytes.slice(0, 8)
    const tag = encryptedBytes.slice(8)
    
    const encryptedData = new Uint8Array(ciphertext.length + tag.length)
    encryptedData.set(ciphertext)
    encryptedData.set(tag, ciphertext.length)
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 16 bytes * 8 = 128 bits
      },
      key,
      encryptedData
    )
    
    const value = new DataView(decrypted).getInt32(0, true)
    return value
    
  } catch (error) {
    console.error('decrypt failed:', error)
    throw error
  }
} 