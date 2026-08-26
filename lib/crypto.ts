import crypto from 'crypto';

/**
 * 🛡️ NEXUS CRYPTOGRAPHIC VAULT ENGINE v4.0 (MILITARY-GRADE)
 * 
 * Cryptographic Specifications:
 * - Algorithm: AES-256-GCM (Authenticated Encryption with Associated Data - AEAD)
 * - Key Derivation: PBKDF2 with HMAC-SHA512, 600,000 iterations (OWASP / NIST SP 800-132 Recommended)
 * - IV: 96-bit (12 bytes) cryptographically secure pseudorandom per encryption
 * - Salt: 256-bit (32 bytes) CSPRNG salt
 * - Tag: 128-bit (16 bytes) authentication tag for tamper resistance
 * - Integrity Checksum: HMAC-SHA512 constant-time verification
 */

// Master key fallback or environment key
const DEFAULT_VAULT_PASSPHRASE = process.env.NEXUS_MASTER_KEY || 'NEXUS-SOVEREIGN-ENTERPRISE-CYBERSECURITY-VAULT-2026-X99';
const PBKDF2_ITERATIONS = 600000;
const KEY_LEN = 32; // 256 bits
const SALT_LEN = 32; // 256 bits
const IV_LEN = 12; // 96 bits for GCM
const AUTH_TAG_LEN = 16; // 128 bits

export interface EncryptedPayload {
  version: 'AES-256-GCM-v1';
  salt: string;       // hex
  iv: string;         // hex
  authTag: string;    // hex
  ciphertext: string; // hex
  hmac: string;       // hex
  timestamp: string;
}

/**
 * Derives a 256-bit encryption key and HMAC key from the master passphrase and salt
 */
function deriveKeys(passphrase: string, salt: Buffer): { encKey: Buffer; hmacKey: Buffer } {
  const masterKey = crypto.pbkdf2Sync(
    passphrase,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LEN + 32, // 64 bytes total: 32 for AES, 32 for HMAC
    'sha512'
  );

  return {
    encKey: masterKey.subarray(0, 32),
    hmacKey: masterKey.subarray(32, 64)
  };
}

/**
 * Encrypts arbitrary string or JSON data using AES-256-GCM with PBKDF2-SHA512
 */
export function encryptData(data: string | object, customKey?: string): EncryptedPayload {
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  const passphrase = customKey || DEFAULT_VAULT_PASSPHRASE;

  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);

  const { encKey, hmacKey } = deriveKeys(passphrase, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv, { authTagLength: AUTH_TAG_LEN });
  
  // Additional Authenticated Data (AAD) for contextual tamper protection
  const aad = Buffer.from('NEXUS-ENTERPRISE-MSSP-VAULT', 'utf8');
  cipher.setAAD(aad);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Compute HMAC over salt + iv + authTag + ciphertext
  const hmac = crypto.createHmac('sha512', hmacKey)
    .update(salt)
    .update(iv)
    .update(authTag)
    .update(Buffer.from(ciphertext, 'hex'))
    .digest('hex');

  return {
    version: 'AES-256-GCM-v1',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext,
    hmac,
    timestamp: new Date().toISOString()
  };
}

/**
 * Decrypts an EncryptedPayload back into plaintext string or typed JSON object
 */
export function decryptData<T = any>(payload: EncryptedPayload, customKey?: string): T {
  if (!payload || payload.version !== 'AES-256-GCM-v1') {
    throw new Error('Formato de carga criptográfica inválido ou versão incompatível');
  }

  const passphrase = customKey || DEFAULT_VAULT_PASSPHRASE;
  const salt = Buffer.from(payload.salt, 'hex');
  const iv = Buffer.from(payload.iv, 'hex');
  const authTag = Buffer.from(payload.authTag, 'hex');
  const ciphertextBuf = Buffer.from(payload.ciphertext, 'hex');

  const { encKey, hmacKey } = deriveKeys(passphrase, salt);

  // 1. Verify HMAC Integrity in Constant-Time
  const computedHmac = crypto.createHmac('sha512', hmacKey)
    .update(salt)
    .update(iv)
    .update(authTag)
    .update(ciphertextBuf)
    .digest('hex');

  const hmacExpected = Buffer.from(payload.hmac, 'hex');
  const hmacActual = Buffer.from(computedHmac, 'hex');

  if (hmacExpected.length !== hmacActual.length || !crypto.timingSafeEqual(hmacExpected, hmacActual)) {
    throw new Error('ALERTA DE SEGURANÇA: Falha na integridade HMAC. O payload foi violado ou adulterado!');
  }

  // 2. Decrypt with AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, iv, { authTagLength: AUTH_TAG_LEN });
  decipher.setAuthTag(authTag);

  const aad = Buffer.from('NEXUS-ENTERPRISE-MSSP-VAULT', 'utf8');
  decipher.setAAD(aad);

  let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return decrypted as unknown as T;
  }
}

/**
 * Field-Level Encryption Helper (Encodes single sensitive strings into compact cipher tokens)
 */
export function encryptSensitiveField(value: string | undefined | null): string {
  if (!value) return '';
  const encrypted = encryptData(value);
  return `ENC[${Buffer.from(JSON.stringify(encrypted)).toString('base64')}]`;
}

/**
 * Field-Level Decryption Helper
 */
export function decryptSensitiveField(value: string | undefined | null): string {
  if (!value) return '';
  if (value.startsWith('ENC[') && value.endsWith(']')) {
    try {
      const raw = Buffer.from(value.slice(4, -1), 'base64').toString('utf8');
      const payload = JSON.parse(raw) as EncryptedPayload;
      return decryptData<string>(payload);
    } catch {
      return value; // Return as-is if decryption fails or fallback
    }
  }
  return value;
}

/**
 * Generates an SHA-512 cryptographic fingerprint / digest
 */
export function generateIntegrityDigest(data: string | Buffer): string {
  return crypto.createHash('sha512').update(data).digest('hex');
}
