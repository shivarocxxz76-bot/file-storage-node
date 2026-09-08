/**
 * Automated Security & Cryptographic Verification Test Suite
 * Validates:
 * 1. AES-256-CBC Encryption & Decryption at Rest
 * 2. SHA-256 Data Integrity Checksums
 * 3. IV Randomness & Ciphertext Indistinguishability
 * 4. Password Security (BCrypt Hashing)
 * 5. Expiring Signed Link & Passcode Logic
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');
const { encryptBuffer, decryptBuffer, generateChecksum } = require('../middleware/cryptoHelper');

async function runSecurityTests() {
    console.log('====================================================');
    console.log('   SECURE FILE STORAGE SYSTEM - SECURITY TEST SUITE ');
    console.log('====================================================\n');

    let passedCount = 0;
    let totalTests = 5;

    // TEST 1: AES-256-CBC Encryption & Bit-for-bit Decryption
    try {
        console.log('[TEST 1] Testing AES-256-CBC Buffer Encryption & Decryption...');
        const originalText = 'CONFIDENTIAL_DATA: Final Year Academic Project File Storage Payload 2026';
        const originalBuffer = Buffer.from(originalText, 'utf-8');

        const { encryptedBuffer, iv } = encryptBuffer(originalBuffer);

        assert(encryptedBuffer.length > 0, 'Encrypted buffer must not be empty');
        assert(iv.length === 32, 'IV hex string must be 32 characters (16 bytes)');
        assert(!encryptedBuffer.includes(Buffer.from('CONFIDENTIAL_DATA')), 'Ciphertext must not contain plaintext fragments');

        const decryptedBuffer = decryptBuffer(encryptedBuffer, iv);
        const decryptedText = decryptedBuffer.toString('utf-8');

        assert.strictEqual(decryptedText, originalText, 'Decrypted payload must match original plaintext exactly');
        console.log('  -> PASS: Encryption & Bit-for-bit Decryption verified.\n');
        passedCount++;
    } catch (err) {
        console.error('  -> FAIL Test 1:', err.message);
    }

    // TEST 2: SHA-256 Checksum Validation
    try {
        console.log('[TEST 2] Testing SHA-256 Cryptographic Checksum Integrity...');
        const sampleData = Buffer.from('Testing checksum integrity for tamper resistance.');
        const checksum1 = generateChecksum(sampleData);
        const checksum2 = generateChecksum(sampleData);

        assert.strictEqual(checksum1, checksum2, 'Identical buffers must yield identical SHA-256 hashes');
        assert.strictEqual(checksum1.length, 64, 'SHA-256 hex string must be 64 characters');

        const tamperedData = Buffer.from('Testing checksum integrity for tamper resistance!');
        const tamperedChecksum = generateChecksum(tamperedData);

        assert.notStrictEqual(checksum1, tamperedChecksum, 'Tampered data must produce a completely different checksum');
        console.log('  -> PASS: SHA-256 Checksum verified.\n');
        passedCount++;
    } catch (err) {
        console.error('  -> FAIL Test 2:', err.message);
    }

    // TEST 3: IV Randomness (Semantic Security)
    try {
        console.log('[TEST 3] Testing IV Randomness & Semantic Security...');
        const plaintext = Buffer.from('Repeated Plaintext Document Payload');

        const res1 = encryptBuffer(plaintext);
        const res2 = encryptBuffer(plaintext);

        assert.notStrictEqual(res1.iv, res2.iv, 'Two distinct encryption operations must have unique IVs');
        assert.notStrictEqual(res1.encryptedBuffer.toString('hex'), res2.encryptedBuffer.toString('hex'), 'Identical plaintexts must produce different ciphertexts with distinct IVs');
        console.log('  -> PASS: Semantic Security (Unique IV per file) verified.\n');
        passedCount++;
    } catch (err) {
        console.error('  -> FAIL Test 3:', err.message);
    }

    // TEST 4: BCrypt Password Hashing & Verification
    try {
        console.log('[TEST 4] Testing BCrypt Salted Password Hashing...');
        const plainPass = 'SuperSecretPassword@2026';
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(plainPass, salt);

        assert(hashed.startsWith('$2'), 'BCrypt hash must start with $2');
        assert.notStrictEqual(plainPass, hashed, 'Stored password must never be in plaintext');

        const isValid = await bcrypt.compare(plainPass, hashed);
        const isInvalid = await bcrypt.compare('WrongPassword@123', hashed);

        assert.strictEqual(isValid, true, 'Valid password must match hash');
        assert.strictEqual(isInvalid, false, 'Invalid password must be rejected');
        console.log('  -> PASS: BCrypt Security verified.\n');
        passedCount++;
    } catch (err) {
        console.error('  -> FAIL Test 4:', err.message);
    }

    // TEST 5: Timed Expiration & Access Token Simulation
    try {
        console.log('[TEST 5] Testing Timed Expiration & Access Token Validation...');
        const now = new Date();
        const expiredDate = new Date(now.getTime() - 60000); // 1 minute ago
        const futureDate = new Date(now.getTime() + 60000); // 1 minute future

        const isExpired = (expiresAt) => expiresAt && new Date(expiresAt) < new Date();

        assert.strictEqual(isExpired(expiredDate), true, 'Past date must be flagged as expired');
        assert.strictEqual(isExpired(futureDate), false, 'Future date must be flagged as valid');
        console.log('  -> PASS: Expiring Link Logic verified.\n');
        passedCount++;
    } catch (err) {
        console.error('  -> FAIL Test 5:', err.message);
    }

    console.log('====================================================');
    console.log(` RESULTS: ${passedCount}/${totalTests} Tests Passed Successfully.`);
    console.log('====================================================');

    if (passedCount === totalTests) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

runSecurityTests();
