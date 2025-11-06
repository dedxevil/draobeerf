// This service uses the Web Crypto API for secure, client-side encryption.

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100000;

// Helper to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Helper to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

// Derives a cryptographic key from a password and salt using PBKDF2
async function getEncryptionKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts a JSON string with a password.
 * @param jsonData The workspace data to encrypt.
 * @param password The user-provided password.
 * @returns A JSON string containing the salt, IV, and ciphertext.
 */
export async function encryptWorkspace(jsonData: string, password: string): Promise<string> {
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await getEncryptionKey(password, salt);

    const encodedData = new TextEncoder().encode(jsonData);
    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        key,
        encodedData
    );

    return JSON.stringify({
        salt: arrayBufferToBase64(salt.buffer),
        iv: arrayBufferToBase64(iv.buffer),
        ciphertext: arrayBufferToBase64(ciphertext),
    });
}

/**
 * Decrypts an encrypted workspace payload with a password.
 * @param encryptedPayload JSON string containing salt, IV, and ciphertext.
 * @param password The user-provided password.
 * @returns The original decrypted JSON string.
 */
export async function decryptWorkspace(encryptedPayload: string, password: string): Promise<string> {
    const { salt, iv, ciphertext } = JSON.parse(encryptedPayload);

    const saltBuffer = base64ToArrayBuffer(salt);
    const ivBuffer = base64ToArrayBuffer(iv);
    const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

    // Fix: The getEncryptionKey function expects a Uint8Array for the salt, but saltBuffer is an ArrayBuffer.
    // Wrap saltBuffer with `new Uint8Array()` to convert it to the correct type.
    const key = await getEncryptionKey(password, new Uint8Array(saltBuffer));

    try {
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivBuffer,
            },
            key,
            ciphertextBuffer
        );
        return new TextDecoder().decode(decrypted);
    } catch (error) {
        // This will typically fail if the password is wrong (tag authentication error)
        console.error('Decryption failed:', error);
        throw new Error('Decryption failed. Invalid password or corrupted file.');
    }
}
