/**
 * AES-CBC encrypter that pairs with the Spring backend decrypter.
 * Output format: base64( IV(16 bytes) || ciphertext ).
 *
 * Browser-safe — uses Web Crypto. Reads the shared key from
 * NEXT_PUBLIC_AES_KEY (must match the backend key, 16/24/32 bytes).
 */
import { env } from "@/src/config/env";

export async function encryptAES(data: string): Promise<string> {
  const key = env.NEXT_PUBLIC_AES_KEY || "default_key_123456";

  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(16));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    encoder.encode(data)
  );

  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);

  return btoa(String.fromCharCode(...combined));
}
