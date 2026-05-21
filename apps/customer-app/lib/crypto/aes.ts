/**
 * AES-GCM-256 encrypter for customer-app that pairs with the Spring backend decrypter.
 * Output format: base64( IV(12 bytes) || ciphertext || authTag(16 bytes) ).
 *
 * Browser-safe — uses Web Crypto. Reads the shared key from AES_KEY
 * (must match the backend key, Base64-encoded 32 bytes).
 */

// IMPORTANT: AES_KEY must be server-side only (not NEXT_PUBLIC_)
const AES_KEY = process.env.AES_KEY;

export async function encryptAES(data: string): Promise<string> {
  // Defensive check: Ensure the key exists and is Base64 encoded (44 chars)
  if (!AES_KEY || AES_KEY.length !== 44) {
    throw new Error("Encryption failed: AES_KEY must be exactly 44 characters (Base64-encoded 32 bytes).");
  }

  // Decode the Base64 string into a 32-byte Uint8Array
  const keyBytes = new Uint8Array(Buffer.from(AES_KEY, "base64"));

  if (keyBytes.length !== 32) {
    throw new Error("Encryption failed: Decoded AES_KEY must be exactly 32 bytes.");
  }

  const encoder = new TextEncoder();

  // 1. Import the key for AES-GCM
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // 2. NIST recommends a 12-byte (96-bit) IV for GCM mode
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt using AES-GCM (this automatically appends a 128-bit authentication tag)
  const encryptedBuffer = await crypto.subtle.encrypt(
    { 
      name: "AES-GCM", 
      iv: iv 
    },
    cryptoKey,
    encoder.encode(data)
  );

  // 4. Combine the 12-byte IV + [Ciphertext + Auth Tag] into a single layout
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv, 0);
  combined.set(encryptedBytes, iv.length);

  // 5. Convert to Base64 safely (works seamlessly across modern environments)
  return Buffer.from(combined).toString("base64");
}
