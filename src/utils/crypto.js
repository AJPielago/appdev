import CryptoJS from 'crypto-js';

// Derive Auth Hash and Encryption Key using PBKDF2 (SHA-256)
export async function deriveKeys(email, password) {
  const emailNorm = email.toLowerCase();
  const passwordWA = CryptoJS.enc.Utf8.parse(password);
  
  // 1. Derive Client-Side AES Key (used for encrypting user vault contents)
  const saltEncWA = CryptoJS.enc.Utf8.parse(emailNorm + '_vault_salt');
  const encKey = CryptoJS.PBKDF2(passwordWA, saltEncWA, {
    keySize: 256 / 32, // 8 words = 32 bytes = 256 bits
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256
  });
  const encKeyHex = encKey.toString(CryptoJS.enc.Hex);
  
  // 2. Derive Auth Hash (sent to the server as password)
  const saltAuthWA = CryptoJS.enc.Utf8.parse(emailNorm + '_auth_salt');
  const authKey = CryptoJS.PBKDF2(passwordWA, saltAuthWA, {
    keySize: 256 / 32, // 8 words = 32 bytes = 256 bits
    iterations: 50000,
    hasher: CryptoJS.algo.SHA256
  });
  const authHashHex = authKey.toString(CryptoJS.enc.Hex);
  
  return { encKeyHex, authHashHex };
}

// Encrypt text string using AES-256-CBC with a hex key
export async function encryptData(plaintext, hexKey) {
  if (!plaintext) return '';
  const keyWA = CryptoJS.enc.Hex.parse(hexKey);
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWA, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  // Concatenate IV and ciphertext to make it a single array
  const combined = iv.clone().concat(encrypted.ciphertext);
  return combined.toString(CryptoJS.enc.Base64);
}

// Decrypt base64-encoded ciphertext using AES-256-CBC with a hex key
export async function decryptData(base64Ciphertext, hexKey) {
  if (!base64Ciphertext) return '';
  try {
    const keyWA = CryptoJS.enc.Hex.parse(hexKey);
    const combinedWA = CryptoJS.enc.Base64.parse(base64Ciphertext);
    
    const combinedHex = combinedWA.toString(CryptoJS.enc.Hex);
    const ivHex = combinedHex.substring(0, 32); // 16 bytes = 32 hex chars
    const ciphertextHex = combinedHex.substring(32);
    
    const ivWA = CryptoJS.enc.Hex.parse(ivHex);
    const ciphertextWA = CryptoJS.enc.Hex.parse(ciphertextHex);
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertextWA },
      keyWA,
      {
        iv: ivWA,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) {
      throw new Error('Decryption returned empty string.');
    }
    return decryptedStr;
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Failed to decrypt data. Invalid key or corrupted payload.', { cause: err });
  }
}

// Encrypt a password/secret key using an access code as the passphrase
export async function encryptWithKey(plaintext, passphrase) {
  if (!plaintext) return '';
  const saltWA = CryptoJS.enc.Utf8.parse(passphrase.toLowerCase() + '_wrap_salt');
  const passphraseWA = CryptoJS.enc.Utf8.parse(passphrase);
  
  const deriveKey = CryptoJS.PBKDF2(passphraseWA, saltWA, {
    keySize: 256 / 32,
    iterations: 10000,
    hasher: CryptoJS.algo.SHA256
  });
  
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, deriveKey, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  const combined = iv.clone().concat(encrypted.ciphertext);
  return combined.toString(CryptoJS.enc.Base64);
}

// Decrypt a password/secret key using an access code as the passphrase
export async function decryptWithKey(base64Ciphertext, passphrase) {
  if (!base64Ciphertext) return '';
  try {
    const saltWA = CryptoJS.enc.Utf8.parse(passphrase.toLowerCase() + '_wrap_salt');
    const passphraseWA = CryptoJS.enc.Utf8.parse(passphrase);
    
    const deriveKey = CryptoJS.PBKDF2(passphraseWA, saltWA, {
      keySize: 256 / 32,
      iterations: 10000,
      hasher: CryptoJS.algo.SHA256
    });
    
    const combinedWA = CryptoJS.enc.Base64.parse(base64Ciphertext);
    const combinedHex = combinedWA.toString(CryptoJS.enc.Hex);
    
    const ivHex = combinedHex.substring(0, 32); // 16 bytes = 32 hex chars
    const ciphertextHex = combinedHex.substring(32);
    
    const ivWA = CryptoJS.enc.Hex.parse(ivHex);
    const ciphertextWA = CryptoJS.enc.Hex.parse(ciphertextHex);
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertextWA },
      deriveKey,
      {
        iv: ivWA,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) {
      throw new Error('Key decryption returned empty string.');
    }
    return decryptedStr;
  } catch (err) {
    console.error('Wrapped key decryption failed:', err);
    throw new Error('Invalid access code or corrupted payload.', { cause: err });
  }
}
