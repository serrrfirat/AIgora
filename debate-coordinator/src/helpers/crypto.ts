/**
 * @module Small crypto utilities for encrypting messages and decrypting them.
 *
 * Usage:
 * ```typescript
 * const plaintext = "0x01234567890123456789"
 * const { privateKey, publicKey } = generateKeyPair();
 *
 * // Encryption of a message using public key.
 * const encrypted = encryptMessage(plaintext, publicKey);
 *
 * // Decryption of a message using private key.
 * const decrypted = decryptMessage(encrypted, privateKey);
 * // Result
 * const result = plaintext == decrypted ? "✅" : "🛑";
 * console.log('\n--- ENCRYPT & DECRYPT ---');
 * console.log('Plaintext message:\t', plaintext);
 * console.log('Ciphertext (base64):\t', encrypted.toString('base64'));
 * console.log("Result:\t", result);
 * console.log('Decrypted message:\t', plaintext);
 * ```
 */

import crypto from 'crypto';

/**
 * Generate a public/private key-pair.
 */
export function generateKeyPair(): { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject; } {
  const { publicKey: publicKey, privateKey: privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  return { privateKey, publicKey }
}

/**
 * Encrypt a message with the recipient's public key
 */
export function encryptMessage(plaintext: string, publicKey: crypto.KeyObject): string {
  const encryptedBuffer = crypto.publicEncrypt(publicKey, Buffer.from(plaintext));
  return encryptedBuffer.toString();
}

/**
 * Decrypt a message with the recipient's private key
 */
export function decryptMessage(ciphertext: string, privateKey: crypto.KeyObject): string {
  const decryptedBuffer = crypto.privateDecrypt(privateKey, ciphertext);
  return decryptedBuffer.toString('utf-8');
}
