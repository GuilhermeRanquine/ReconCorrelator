import { encryptData, decryptData, encryptSensitiveField, decryptSensitiveField, generateIntegrityDigest } from '../crypto';

console.log('🧪 Iniciando Testes Unitários do Motor Criptográfico Nexus v4.0...');

// Test 1: Full payload encryption & decryption
const testPayload = {
  client: 'Banco Nacional S.A.',
  cnpj: '12.345.678/0001-99',
  criticalFindings: [
    { id: 'CVE-2026-9999', title: 'RCE em Spring Cloud Gateway', cvss: 9.8 }
  ],
  apiKeySecret: 'AKIA_NEXUS_SUPER_SECRET_KEY_99'
};

const encrypted = encryptData(testPayload);
console.log('✅ AES-256-GCM Payload Criptografado com sucesso:');
console.log(' - Versão:', encrypted.version);
console.log(' - Salt (256-bit):', encrypted.salt.substring(0, 16) + '...');
console.log(' - IV (96-bit):', encrypted.iv);
console.log(' - Auth Tag (128-bit):', encrypted.authTag);
console.log(' - HMAC-SHA512:', encrypted.hmac.substring(0, 24) + '...');

const decrypted = decryptData<typeof testPayload>(encrypted);
if (decrypted.client === testPayload.client && decrypted.criticalFindings[0].cvss === 9.8) {
  console.log('✅ Decriptação e integridade validadas perfeitamente!');
} else {
  throw new Error('Falha no teste de decriptação');
}

// Test 2: Anti-tamper verification
let tamperFailed = false;
try {
  const tampered = { ...encrypted, ciphertext: encrypted.ciphertext.slice(0, -2) + 'aa' };
  decryptData(tampered);
} catch (err: any) {
  tamperFailed = true;
  console.log('✅ Detecção de adulteração (Tamper Resistance) ativa:', err.message);
}

if (!tamperFailed) {
  throw new Error('Falha no teste de tamper resistance');
}

// Test 3: Field-level encryption
const sensitiveApiKey = 'ghp_secret_token_nexus_red_team_2026';
const tokenEncrypted = encryptSensitiveField(sensitiveApiKey);
console.log('✅ Field-Level Token:', tokenEncrypted.substring(0, 30) + '...');

const tokenDecrypted = decryptSensitiveField(tokenEncrypted);
if (tokenDecrypted === sensitiveApiKey) {
  console.log('✅ Field-Level Decryption perfeito!');
} else {
  throw new Error('Falha no Field-Level encryption');
}

console.log('🎉 TODOS OS TESTES CRIPTOGRÁFICOS PASSARAM COM 100% DE SUCESSO!');
