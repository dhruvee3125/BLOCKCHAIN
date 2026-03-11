/**
 * Encryption & Security Utility Module
 * Handles AES-256 encryption, password hashing, and secure data handling
 */

import crypto from 'crypto';
import bcryptjs from 'bcryptjs';

// Encryption key - In production, load from environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_IV_LENGTH = 16;

/**
 * Hash a password using bcryptjs
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  try {
    const salt = await bcryptjs.genSalt(10);
    const hashed = await bcryptjs.hash(password, salt);
    return hashed;
  } catch (error) {
    throw new Error('Password hashing failed: ' + error.message);
  }
}

/**
 * Compare plain password with hashed password
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match
 */
export async function comparePassword(plainPassword, hashedPassword) {
  try {
    return await bcryptjs.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new Error('Password comparison failed: ' + error.message);
  }
}

/**
 * Encrypt sensitive data using AES-256-CBC
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text (IV:encryptedData in hex)
 */
export function encryptData(text) {
  try {
    if (typeof text === 'object') {
      text = JSON.stringify(text);
    }

    const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV and encrypted data separated by colon
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
}

/**
 * Decrypt encrypted data
 * @param {string} encryptedText - Encrypted text (IV:encryptedData format)
 * @returns {string} - Decrypted plain text
 */
export function decryptData(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
}

/**
 * Encrypt a will object
 * @param {Object} willData - Will object to encrypt
 * @returns {Object} - Will with encrypted sensitive fields
 */
export function encryptWill(willData) {
  try {
    const encrypted = { ...willData };

    // Encrypt sensitive fields
    encrypted.asset = encryptData(willData.asset);
    encrypted.assetDescription = encryptData(willData.assetDescription);
    encrypted.verificationReason = encryptData(willData.verificationReason || '');

    // Mark as encrypted
    encrypted.encrypted = true;

    return encrypted;
  } catch (error) {
    throw new Error('Will encryption failed: ' + error.message);
  }
}

/**
 * Decrypt a will object
 * @param {Object} encryptedWill - Encrypted will object
 * @returns {Object} - Will with decrypted sensitive fields
 */
export function decryptWill(encryptedWill) {
  try {
    if (!encryptedWill.encrypted) {
      return encryptedWill; // Already decrypted
    }

    const decrypted = { ...encryptedWill };

    // Decrypt sensitive fields
    if (decrypted.asset) {
      decrypted.asset = decryptData(decrypted.asset);
    }
    if (decrypted.assetDescription) {
      decrypted.assetDescription = decryptData(decrypted.assetDescription);
    }
    if (decrypted.verificationReason) {
      decrypted.verificationReason = decryptData(decrypted.verificationReason);
    }

    decrypted.encrypted = false;

    return decrypted;
  } catch (error) {
    throw new Error('Will decryption failed: ' + error.message);
  }
}

/**
 * Encrypt sensitive fields in user object
 * @param {Object} user - User object
 * @returns {Object} - User with encrypted password
 */
export async function encryptUserCredentials(user) {
  try {
    const encrypted = { ...user };
    encrypted.passwordHash = await hashPassword(user.password);
    delete encrypted.password; // Remove plain text password
    return encrypted;
  } catch (error) {
    throw new Error('User encryption failed: ' + error.message);
  }
}

/**
 * Encrypt file buffer (for IPFS documents)
 * @param {Buffer} fileBuffer - File content as buffer
 * @returns {Object} - { encryptedBuffer, iv, salt }
 */
export function encryptFile(fileBuffer) {
  try {
    const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(fileBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return {
      encryptedBuffer: encrypted,
      iv: iv.toString('hex'),
      algorithm: 'aes-256-cbc'
    };
  } catch (error) {
    throw new Error('File encryption failed: ' + error.message);
  }
}

/**
 * Decrypt file buffer (for IPFS documents)
 * @param {Buffer} encryptedBuffer - Encrypted file content
 * @param {string} iv - Initialization vector (hex)
 * @returns {Buffer} - Decrypted file buffer
 */
export function decryptFile(encryptedBuffer, iv) {
  try {
    const ivBuffer = Buffer.from(iv, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  } catch (error) {
    throw new Error('File decryption failed: ' + error.message);
  }
}

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Random hex token
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Sanitize user data before sending to frontend
 * @param {Object} user - User object
 * @returns {Object} - Sanitized user (no passwords)
 */
export function sanitizeUser(user) {
  const sanitized = { ...user };
  delete sanitized.password;
  delete sanitized.passwordHash;
  return sanitized;
}

/**
 * Create secure session data
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {Object} - Session data
 */
export function createSessionData(userId, role) {
  return {
    userId,
    role,
    createdAt: Date.now(),
    sessionId: generateSecureToken(16)
  };
}

export default {
  hashPassword,
  comparePassword,
  encryptData,
  decryptData,
  encryptWill,
  decryptWill,
  encryptUserCredentials,
  encryptFile,
  decryptFile,
  generateSecureToken,
  sanitizeUser,
  createSessionData
};
