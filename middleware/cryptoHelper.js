/**
 * Cryptographic Security Engine
 * AES-256-CBC File Encryption at Rest & SHA-256 File Integrity Checksum
 */

const crypto = require('crypto');

// Master Encryption Key (32 bytes derived from master secret)
const getMasterKey = () => {
    const secret = process.env.FILE_ENCRYPTION_KEY || 'securevault_default_aes256_master_key_2026';
    return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypt a buffer with AES-256-CBC
 * @param {Buffer} buffer - Plaintext file buffer
 * @returns {{ encryptedBuffer: Buffer, ivHex: string, sha256Hex: string }}
 */
const encryptBuffer = (buffer) => {
    const masterKey = getMasterKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', masterKey, iv);
    
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
        encryptedBuffer: encrypted,
        iv: iv.toString('hex'),
        ivHex: iv.toString('hex'),
        sha256Hex: sha256
    };
};

/**
 * Generate SHA-256 Checksum for a buffer
 * @param {Buffer} buffer 
 * @returns {string} - Hex string of SHA-256 hash
 */
const generateChecksum = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Decrypt a buffer with AES-256-CBC
 * @param {Buffer} encryptedBuffer - Ciphertext file buffer
 * @param {string} ivHex - Hex string of 16-byte initialization vector
 * @returns {Buffer} - Decrypted plaintext file buffer
 */
const decryptBuffer = (encryptedBuffer, ivHex) => {
    const masterKey = getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', masterKey, iv);
    
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
};

/**
 * Create a Decipher transform stream for large file streaming
 * @param {string} ivHex - Hex string of 16-byte IV
 */
const createDecipherStream = (ivHex) => {
    const masterKey = getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    return crypto.createDecipheriv('aes-256-cbc', masterKey, iv);
};

module.exports = {
    encryptBuffer,
    decryptBuffer,
    generateChecksum,
    createDecipherStream
};

